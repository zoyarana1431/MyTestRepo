from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.enums import ExecutionCycleStatus
from app.models.execution_cycle import ExecutionCycle
from app.schemas.execution_cycle import ExecutionCycleCreate, ExecutionCycleRead, ExecutionCycleUpdate
from app.services.id_generator import next_code

router = APIRouter(prefix="/projects/{project_id}/execution-cycles", tags=["execution-cycles"])


def _cycle(db: Session, project_id: int, cycle_id: int) -> ExecutionCycle | None:
    c = db.get(ExecutionCycle, cycle_id)
    if c is None or c.project_id != project_id:
        return None
    return c


@router.get("", response_model=list[ExecutionCycleRead])
def list_cycles(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> list[ExecutionCycle]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)
    return list(
        db.execute(
            select(ExecutionCycle)
            .where(ExecutionCycle.project_id == project_id)
            .order_by(ExecutionCycle.created_at.desc())
        )
        .scalars()
        .all()
    )


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
