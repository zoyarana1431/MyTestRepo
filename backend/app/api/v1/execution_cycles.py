from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.enums import ExecutionCycleStatus
from app.models.execution import Execution
from app.models.execution_cycle import ExecutionCycle
from app.schemas.execution_cycle import (
    ExecutionCycleCreate,
    ExecutionCycleListItem,
    ExecutionCycleRead,
    ExecutionCycleUpdate,
)
from app.services.id_generator import next_code

router = APIRouter(prefix="/projects/{project_id}/execution-cycles", tags=["execution-cycles"])


def _cycle(db: Session, project_id: int, cycle_id: int) -> ExecutionCycle | None:
    c = db.get(ExecutionCycle, cycle_id)
    if c is None or c.project_id != project_id:
        return None
    return c


def _execution_stats_by_cycle(db: Session, project_id: int, cycle_ids: list[int]) -> dict[int, dict[str, int]]:
    if not cycle_ids:
        return {}
    pass_c = case((Execution.status == "pass", 1), else_=0)
    fail_c = case((Execution.status == "fail", 1), else_=0)
    blocked_c = case((Execution.status == "blocked", 1), else_=0)
    not_run_c = case((Execution.status == "not_run", 1), else_=0)
    retest_c = case((Execution.status == "retest", 1), else_=0)
    stmt = (
        select(
            Execution.execution_cycle_id,
            func.count(Execution.id).label("total_executions"),
            func.coalesce(func.sum(pass_c), 0).label("pass_count"),
            func.coalesce(func.sum(fail_c), 0).label("fail_count"),
            func.coalesce(func.sum(blocked_c), 0).label("blocked_count"),
            func.coalesce(func.sum(not_run_c), 0).label("not_run_count"),
            func.coalesce(func.sum(retest_c), 0).label("retest_count"),
        )
        .where(
            Execution.project_id == project_id,
            Execution.execution_cycle_id.in_(cycle_ids),
        )
        .group_by(Execution.execution_cycle_id)
    )
    out: dict[int, dict[str, int]] = {}
    for row in db.execute(stmt):
        cid = row.execution_cycle_id
        if cid is None:
            continue
        out[cid] = {
            "total_executions": int(row.total_executions),
            "pass_count": int(row.pass_count),
            "fail_count": int(row.fail_count),
            "blocked_count": int(row.blocked_count),
            "not_run_count": int(row.not_run_count),
            "retest_count": int(row.retest_count),
        }
    return out


@router.get("", response_model=list[ExecutionCycleListItem])
def list_cycles(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> list[ExecutionCycleListItem]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)
    cycles = list(
        db.execute(
            select(ExecutionCycle)
            .where(ExecutionCycle.project_id == project_id)
            .order_by(ExecutionCycle.created_at.desc())
        )
        .scalars()
        .all()
    )
    ids = [c.id for c in cycles]
    stats = _execution_stats_by_cycle(db, project_id, ids)
    zero = {
        "total_executions": 0,
        "pass_count": 0,
        "fail_count": 0,
        "blocked_count": 0,
        "not_run_count": 0,
        "retest_count": 0,
    }
    out: list[ExecutionCycleListItem] = []
    for c in cycles:
        base = ExecutionCycleRead.model_validate(c)
        s = stats.get(c.id, zero)
        out.append(ExecutionCycleListItem(**base.model_dump(), **s))
    return out


@router.post("", response_model=ExecutionCycleRead, status_code=status.HTTP_201_CREATED)
def create_cycle(
    project_id: int,
    body: ExecutionCycleCreate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> ExecutionCycle:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    code = next_code(db, f"run:{project_id}", "RUN", width=3)
    st = body.status
    if st not in {x.value for x in ExecutionCycleStatus}:
        st = ExecutionCycleStatus.planned.value
    c = ExecutionCycle(
        project_id=project_id,
        code=code,
        name=body.name.strip(),
        build_version=body.build_version,
        description=body.description,
        start_date=body.start_date,
        end_date=body.end_date,
        status=st,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/{cycle_id}", response_model=ExecutionCycleRead)
def get_cycle(
    project_id: int,
    cycle_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> ExecutionCycle:
    require_project_member(db, user, project_id)
    c = _cycle(db, project_id, cycle_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle not found")
    return c


@router.patch("/{cycle_id}", response_model=ExecutionCycleRead)
def update_cycle(
    project_id: int,
    cycle_id: int,
    body: ExecutionCycleUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> ExecutionCycle:
    require_project_admin(db, user, project_id)
    c = _cycle(db, project_id, cycle_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{cycle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cycle(
    project_id: int,
    cycle_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> None:
    require_project_admin(db, user, project_id)
    c = _cycle(db, project_id, cycle_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle not found")
    db.delete(c)
    db.commit()
