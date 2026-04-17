from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.defect import Defect
from app.models.enums import RequirementPriority, RequirementStatus
from app.models.execution import Execution
from app.models.links import requirement_test_cases
from app.models.module import Module
from app.models.requirement import Requirement
from app.models.test_case import TestCase
from app.schemas.requirement import (
    LinkedTestCaseBrief,
    RequirementCreate,
    RequirementDetail,
    RequirementListItem,
    RequirementRead,
    RequirementTestCasesLink,
    RequirementUpdate,
)
from app.services.id_generator import next_code

router = APIRouter(prefix="/projects/{project_id}/requirements", tags=["requirements"])


def _req_in_project(db: Session, project_id: int, requirement_id: int) -> Requirement | None:
    r = db.get(Requirement, requirement_id)
    if r is None or r.project_id != project_id or r.deleted_at is not None:
        return None
    return r


def _module_in_project(db: Session, project_id: int, module_id: int | None) -> None:
    if module_id is None:
        return
    m = db.get(Module, module_id)
    if m is None or m.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Module is not in this project")


def _tc_brief_title(tc: TestCase) -> str:
    if tc.feature_name:
        return tc.feature_name.strip()
    if tc.test_scenario:
        t = tc.test_scenario.strip()
        return t[:120] + ("…" if len(t) > 120 else "")
    return tc.code


def _requirement_detail(db: Session, project_id: int, req: Requirement) -> RequirementDetail:
    db.refresh(req, ["test_cases"])
    tcs = sorted(req.test_cases, key=lambda t: t.code)
    briefs = [
        LinkedTestCaseBrief(
            id=tc.id,
            code=tc.code,
            title=_tc_brief_title(tc),
            status=tc.status,
            priority=tc.priority,
        )
        for tc in tcs
    ]
    base = RequirementRead.model_validate(req)
    open_defects = int(
        db.execute(
            select(func.count())
            .select_from(Defect)
            .where(
                Defect.project_id == project_id,
                Defect.requirement_id == req.id,
                Defect.deleted_at.is_(None),
                Defect.status.in_(["open", "in_progress"]),
            )
        ).scalar_one()
    )
    total_exec = int(
        db.execute(
            select(func.count())
            .select_from(Execution)
            .where(Execution.project_id == project_id, Execution.requirement_id == req.id)
        ).scalar_one()
    )
    module_name: str | None = None
    if req.module_id is not None:
        mod = db.get(Module, req.module_id)
        module_name = mod.name if mod else None

    return RequirementDetail(
        **base.model_dump(),
        test_cases=briefs,
        open_defects_count=open_defects,
        total_executions_count=total_exec,
        module_name=module_name,
    )


@router.get("", response_model=list[RequirementListItem])
def list_requirements(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    q: str | None = Query(None, description="Search title or code"),
    status_filter: str | None = Query(None, alias="status"),
    priority_filter: str | None = Query(None, alias="priority"),
    module_id: int | None = None,
) -> list[RequirementListItem]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)

    mod_map = {
        m.id: m.name
        for m in db.execute(select(Module).where(Module.project_id == project_id)).scalars().all()
    }

    cnt = func.count(requirement_test_cases.c.test_case_id).label("tc_count")
    stmt = (
        select(Requirement, cnt)
        .outerjoin(requirement_test_cases, Requirement.id == requirement_test_cases.c.requirement_id)
        .where(Requirement.project_id == project_id, Requirement.deleted_at.is_(None))
        .group_by(Requirement.id)
    )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where((Requirement.title.ilike(like)) | (Requirement.code.ilike(like)))
    if status_filter:
        stmt = stmt.where(Requirement.status == status_filter)
    if priority_filter:
        stmt = stmt.where(Requirement.priority == priority_filter)
    if module_id is not None:
        stmt = stmt.where(Requirement.module_id == module_id)

    stmt = stmt.order_by(Requirement.code)
    rows = db.execute(stmt).all()
    out: list[RequirementListItem] = []
    for req, tc_count in rows:
        base = RequirementRead.model_validate(req)
        mn = mod_map.get(req.module_id) if req.module_id is not None else None
        out.append(
            RequirementListItem(
                **base.model_dump(),
                linked_test_case_count=int(tc_count or 0),
                module_name=mn,
            )
        )
    return out


@router.post("", response_model=RequirementRead, status_code=status.HTTP_201_CREATED)
def create_requirement(
    project_id: int,
    body: RequirementCreate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Requirement:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    _module_in_project(db, project_id, body.module_id)

    code = next_code(db, f"req:{project_id}", "REQ", width=3)
    req = Requirement(
        project_id=project_id,
        code=code,
        title=body.title.strip(),
        description=body.description,
        module_id=body.module_id,
        priority=body.priority.value,
        status=body.status.value,
        source_reference=body.source_reference,
        tags=body.tags,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/{requirement_id}", response_model=RequirementDetail)
def get_requirement(
    project_id: int,
    requirement_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> RequirementDetail:
    require_project_member(db, user, project_id)
    req = _req_in_project(db, project_id, requirement_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")

    return _requirement_detail(db, project_id, req)


@router.patch("/{requirement_id}", response_model=RequirementRead)
def update_requirement(
    project_id: int,
    requirement_id: int,
    body: RequirementUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Requirement:
    require_project_admin(db, user, project_id)
    req = _req_in_project(db, project_id, requirement_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")

    data = body.model_dump(exclude_unset=True)
    if "module_id" in data:
        _module_in_project(db, project_id, data["module_id"])
    if "priority" in data and data["priority"] is not None:
        p = data["priority"]
        data["priority"] = p.value if hasattr(p, "value") else str(p)
    if "status" in data and data["status"] is not None:
        s = data["status"]
        data["status"] = s.value if hasattr(s, "value") else str(s)
    for k, v in data.items():
        setattr(req, k, v)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(
    project_id: int,
    requirement_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> None:
    require_project_admin(db, user, project_id)
    req = _req_in_project(db, project_id, requirement_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    req.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.put("/{requirement_id}/test-cases", response_model=RequirementDetail)
def link_requirement_test_cases(
    project_id: int,
    requirement_id: int,
    body: RequirementTestCasesLink,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> RequirementDetail:
    require_project_admin(db, user, project_id)
    req = _req_in_project(db, project_id, requirement_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")

    ids = list(dict.fromkeys(body.test_case_ids))
    if not ids:
        req.test_cases = []
        db.commit()
    else:
        tcs = db.execute(
            select(TestCase).where(
                TestCase.project_id == project_id,
                TestCase.id.in_(ids),
                TestCase.deleted_at.is_(None),
            )
        ).scalars().all()
        if len(tcs) != len(set(ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more test cases are invalid or not in this project",
            )
        req.test_cases = list(tcs)
        db.commit()

    return _requirement_detail(db, project_id, req)
