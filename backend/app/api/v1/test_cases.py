from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.module import Module
from app.models.requirement import Requirement
from app.models.test_case import TestCase, TestCaseStep
from app.models.links import requirement_test_cases
from app.schemas.test_case import (
    LinkedRequirementBrief,
    TestCaseCreate,
    TestCaseDetail,
    TestCaseListItem,
    TestCaseRead,
    TestCaseStepCreate,
    TestCaseStepRead,
    TestCaseUpdate,
)
from app.services.id_generator import next_code
from app.services.test_case_steps import replace_test_case_steps

router = APIRouter(prefix="/projects/{project_id}/test-cases", tags=["test-cases"])


def _tc_in_project(db: Session, project_id: int, test_case_id: int) -> TestCase | None:
    tc = db.get(TestCase, test_case_id)
    if tc is None or tc.project_id != project_id or tc.deleted_at is not None:
        return None
    return tc


def _module_in_project(db: Session, project_id: int, module_id: int | None) -> None:
    if module_id is None:
        return
    m = db.get(Module, module_id)
    if m is None or m.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Module is not in this project")


def _load_req_links(db: Session, project_id: int, requirement_ids: list[int]) -> list[Requirement]:
    if not requirement_ids:
        return []
    ids = list(dict.fromkeys(requirement_ids))
    reqs = db.execute(
        select(Requirement).where(
            Requirement.project_id == project_id,
            Requirement.id.in_(ids),
            Requirement.deleted_at.is_(None),
        )
    ).scalars().all()
    if len(reqs) != len(ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more requirements are invalid or not in this project",
        )
    return reqs


def _to_detail(tc: TestCase) -> TestCaseDetail:
    steps = sorted(tc.steps, key=lambda s: s.step_number)
    step_reads = [TestCaseStepRead.model_validate(s) for s in steps]
    reqs = sorted(tc.requirements, key=lambda r: r.code)
    req_briefs = [LinkedRequirementBrief(id=r.id, code=r.code, title=r.title, status=r.status) for r in reqs]
    base = TestCaseRead.model_validate(tc)
    return TestCaseDetail(**base.model_dump(), steps=step_reads, requirements=req_briefs)


def _apply_tc_update(tc: TestCase, data: dict) -> None:
    enum_map = {
        "test_type": lambda v: v.value if hasattr(v, "value") else v,
        "priority": lambda v: v.value if hasattr(v, "value") else v,
        "severity": lambda v: v.value if hasattr(v, "value") else v,
        "status": lambda v: v.value if hasattr(v, "value") else v,
    }
    for k, v in data.items():
        if k in enum_map and v is not None:
            v = enum_map[k](v)
        setattr(tc, k, v)


@router.get("", response_model=list[TestCaseListItem])
def list_test_cases(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    q: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    module_id: int | None = None,
) -> list[TestCaseListItem]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)

    stmt = select(TestCase).where(TestCase.project_id == project_id, TestCase.deleted_at.is_(None))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                TestCase.code.ilike(like),
                func.coalesce(TestCase.feature_name, "").ilike(like),
                func.coalesce(TestCase.test_scenario, "").ilike(like),
            )
        )
    if status_filter:
        stmt = stmt.where(TestCase.status == status_filter)
    if module_id is not None:
        stmt = stmt.where(TestCase.module_id == module_id)

    tcs = db.execute(stmt.order_by(TestCase.code)).scalars().all()
    if not tcs:
        return []

    ids = [t.id for t in tcs]
    rq_rows = db.execute(
        select(requirement_test_cases.c.test_case_id, func.count())
        .where(requirement_test_cases.c.test_case_id.in_(ids))
        .group_by(requirement_test_cases.c.test_case_id)
    ).all()
    rq_map = {r[0]: r[1] for r in rq_rows}
    st_rows = db.execute(
        select(TestCaseStep.test_case_id, func.count())
        .where(TestCaseStep.test_case_id.in_(ids))
        .group_by(TestCaseStep.test_case_id)
    ).all()
    st_map = {r[0]: r[1] for r in st_rows}

    out: list[TestCaseListItem] = []
    for tc in tcs:
        base = TestCaseRead.model_validate(tc)
        out.append(
            TestCaseListItem(
                **base.model_dump(),
                linked_requirement_count=rq_map.get(tc.id, 0),
                step_count=st_map.get(tc.id, 0),
            )
        )
    return out


@router.post("", response_model=TestCaseDetail, status_code=status.HTTP_201_CREATED)
def create_test_case(
    project_id: int,
    body: TestCaseCreate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> TestCaseDetail:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    _module_in_project(db, project_id, body.module_id)

    code = next_code(db, f"tc:{project_id}", "TC", width=3)
    tc = TestCase(
        project_id=project_id,
        code=code,
        module_id=body.module_id,
        feature_name=body.feature_name,
        test_scenario=body.test_scenario,
        description=body.description,
        test_type=body.test_type.value,
        priority=body.priority.value,
        severity=body.severity.value,
        preconditions=body.preconditions,
        expected_result_summary=body.expected_result_summary,
        platform=body.platform,
        environment=body.environment,
        tags=body.tags,
        is_reusable=body.is_reusable,
        status=body.status.value,
        created_by=user.id,
    )
    db.add(tc)
    db.flush()

    if body.steps:
        replace_test_case_steps(db, tc.id, body.steps)

    reqs = _load_req_links(db, project_id, body.requirement_ids)
    tc.requirements = reqs

    db.commit()
    db.refresh(tc)
    db.refresh(tc, ["steps", "requirements"])
    return _to_detail(tc)


@router.get("/{test_case_id}", response_model=TestCaseDetail)
def get_test_case(
    project_id: int,
    test_case_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> TestCaseDetail:
    require_project_member(db, user, project_id)
    tc = _tc_in_project(db, project_id, test_case_id)
    if tc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")
    db.refresh(tc, ["steps", "requirements"])
    return _to_detail(tc)


@router.patch("/{test_case_id}", response_model=TestCaseDetail)
def update_test_case(
    project_id: int,
    test_case_id: int,
    body: TestCaseUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> TestCaseDetail:
    require_project_admin(db, user, project_id)
    tc = _tc_in_project(db, project_id, test_case_id)
    if tc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")

    data = body.model_dump(exclude_unset=True)
    if "module_id" in data:
        _module_in_project(db, project_id, data["module_id"])

    req_ids = data.pop("requirement_ids", None)
    steps_in = data.pop("steps", None)

    if data:
        _apply_tc_update(tc, data)

    if req_ids is not None:
        tc.requirements = _load_req_links(db, project_id, req_ids)

    if steps_in is not None:
        parsed = [TestCaseStepCreate.model_validate(s) for s in steps_in]
        replace_test_case_steps(db, tc.id, parsed)

    db.commit()
    db.refresh(tc)
    db.refresh(tc, ["steps", "requirements"])
    return _to_detail(tc)


@router.delete("/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_case(
    project_id: int,
    test_case_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> None:
    require_project_admin(db, user, project_id)
    tc = _tc_in_project(db, project_id, test_case_id)
    if tc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")
    tc.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/{test_case_id}/duplicate", response_model=TestCaseDetail, status_code=status.HTTP_201_CREATED)
def duplicate_test_case(
    project_id: int,
    test_case_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> TestCaseDetail:
    require_project_admin(db, user, project_id)
    src = _tc_in_project(db, project_id, test_case_id)
    if src is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")
    db.refresh(src, ["steps"])

    code = next_code(db, f"tc:{project_id}", "TC", width=3)
    dup = TestCase(
        project_id=project_id,
        code=code,
        module_id=src.module_id,
        feature_name=src.feature_name,
        test_scenario=src.test_scenario,
        description=src.description,
        test_type=src.test_type,
        priority=src.priority,
        severity=src.severity,
        preconditions=src.preconditions,
        expected_result_summary=src.expected_result_summary,
        platform=src.platform,
        environment=src.environment,
        tags=src.tags,
        is_reusable=src.is_reusable,
        status=src.status,
        created_by=user.id,
    )
    db.add(dup)
    db.flush()

    step_creates = [
        TestCaseStepCreate(
            step_number=s.step_number,
            action=s.action,
            test_data=s.test_data,
            expected_result=s.expected_result,
        )
        for s in sorted(src.steps, key=lambda x: x.step_number)
    ]
    if step_creates:
        replace_test_case_steps(db, dup.id, step_creates)

    dup.requirements = []
    db.commit()
    db.refresh(dup)
    db.refresh(dup, ["steps", "requirements"])
    return _to_detail(dup)
