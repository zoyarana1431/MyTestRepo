from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.execution import Execution
from app.models.execution_cycle import ExecutionCycle
from app.models.links import requirement_test_cases
from app.models.requirement import Requirement
from app.models.test_case import TestCase
from app.schemas.execution import ExecutionCreate, ExecutionListItem, ExecutionRead
from app.services.id_generator import next_code

router = APIRouter(prefix="/projects/{project_id}/executions", tags=["executions"])

VALID_STATUS = frozenset({"pass", "fail", "blocked", "not_run", "retest"})


def _exec(db: Session, project_id: int, execution_id: int) -> Execution | None:
    e = db.get(Execution, execution_id)
    if e is None or e.project_id != project_id:
        return None
    return e


def _tc_title(tc: TestCase) -> str:
    if tc.feature_name:
        return tc.feature_name.strip()
    if tc.test_scenario:
        t = tc.test_scenario.strip()
        return t[:100] + ("…" if len(t) > 100 else "")
    return tc.code


def _validate_req_tc(db: Session, requirement_id: int | None, test_case_id: int) -> None:
    if requirement_id is None:
        return
    row = db.execute(
        select(requirement_test_cases.c.requirement_id).where(
            requirement_test_cases.c.requirement_id == requirement_id,
            requirement_test_cases.c.test_case_id == test_case_id,
        )
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requirement must be linked to the selected test case",
        )


@router.get("", response_model=list[ExecutionListItem])
def list_executions(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    q: str | None = Query(None),
    test_case_id: int | None = None,
    execution_cycle_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
) -> list[ExecutionListItem]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)

    stmt = select(Execution).where(Execution.project_id == project_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.join(TestCase, TestCase.id == Execution.test_case_id).where(
            or_(
                Execution.code.ilike(like),
                TestCase.code.ilike(like),
                func.coalesce(TestCase.feature_name, "").ilike(like),
            )
        )
    if test_case_id is not None:
        stmt = stmt.where(Execution.test_case_id == test_case_id)
    if execution_cycle_id is not None:
        stmt = stmt.where(Execution.execution_cycle_id == execution_cycle_id)
    if status_filter:
        stmt = stmt.where(Execution.status == status_filter)

    rows = db.execute(stmt.order_by(Execution.executed_at.desc())).scalars().all()
    out: list[ExecutionListItem] = []
    for e in rows:
        tc = db.get(TestCase, e.test_case_id)
        base = ExecutionRead.model_validate(e)
        out.append(
            ExecutionListItem(
                **base.model_dump(),
                test_case_code=tc.code if tc else "",
                test_case_title=_tc_title(tc) if tc else "",
            )
        )
    return out


@router.post("", response_model=ExecutionRead, status_code=status.HTTP_201_CREATED)
def create_execution(
    project_id: int,
    body: ExecutionCreate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Execution:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)

    if body.status not in VALID_STATUS:
        raise HTTPException(status_code=400, detail="Invalid execution status")

    tc = db.get(TestCase, body.test_case_id)
    if tc is None or tc.project_id != project_id or tc.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Test case not in this project")

    if body.requirement_id is not None:
        req = db.get(Requirement, body.requirement_id)
        if req is None or req.project_id != project_id or req.deleted_at is not None:
            raise HTTPException(status_code=400, detail="Requirement not in this project")
        _validate_req_tc(db, body.requirement_id, body.test_case_id)

    if body.execution_cycle_id is not None:
        cyc = db.get(ExecutionCycle, body.execution_cycle_id)
        if cyc is None or cyc.project_id != project_id:
            raise HTTPException(status_code=400, detail="Execution cycle not in this project")

    code = next_code(db, f"exe:{project_id}", "EXE", width=6)
    executed_at = body.executed_at or datetime.now(timezone.utc)

    ex = Execution(
        project_id=project_id,
        code=code,
        test_case_id=body.test_case_id,
        requirement_id=body.requirement_id,
        execution_cycle_id=body.execution_cycle_id,
        build_version=body.build_version,
        platform=body.platform,
        environment=body.environment,
        executed_by=user.id,
        executed_at=executed_at,
        status=body.status,
        actual_result=body.actual_result,
        retest_required=body.retest_required,
        retest_at=body.retest_at,
        final_status=body.final_status,
        comments=body.comments,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.get("/{execution_id}", response_model=ExecutionRead)
def get_execution(
    project_id: int,
    execution_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Execution:
    require_project_member(db, user, project_id)
    e = _exec(db, project_id, execution_id)
    if e is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
    return e
