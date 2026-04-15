from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.defect import Defect
from app.models.execution import Execution
from app.models.module import Module
from app.models.requirement import Requirement
from app.models.test_case import TestCase
from app.schemas.defect import DefectCreate, DefectRead, DefectUpdate
from app.services.id_generator import next_code

router = APIRouter(prefix="/projects/{project_id}/defects", tags=["defects"])


def _defect(db: Session, project_id: int, defect_id: int) -> Defect | None:
    d = db.get(Defect, defect_id)
    if d is None or d.project_id != project_id or d.deleted_at is not None:
        return None
    return d


def _check_fk(
    db: Session,
    project_id: int,
    module_id: int | None,
    requirement_id: int | None,
    test_case_id: int | None,
    execution_id: int | None,
) -> None:
    if module_id is not None:
        m = db.get(Module, module_id)
        if m is None or m.project_id != project_id:
            raise HTTPException(status_code=400, detail="Invalid module")
    if requirement_id is not None:
        r = db.get(Requirement, requirement_id)
        if r is None or r.project_id != project_id or r.deleted_at is not None:
            raise HTTPException(status_code=400, detail="Invalid requirement")
    if test_case_id is not None:
        tc = db.get(TestCase, test_case_id)
        if tc is None or tc.project_id != project_id or tc.deleted_at is not None:
            raise HTTPException(status_code=400, detail="Invalid test case")
    if execution_id is not None:
        ex = db.get(Execution, execution_id)
        if ex is None or ex.project_id != project_id:
            raise HTTPException(status_code=400, detail="Invalid execution")


@router.get("", response_model=list[DefectRead])
def list_defects(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    q: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = None,
    priority: str | None = None,
) -> list[Defect]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)

    stmt = select(Defect).where(Defect.project_id == project_id, Defect.deleted_at.is_(None))
    if status_filter:
        stmt = stmt.where(Defect.status == status_filter)
    if severity:
        stmt = stmt.where(Defect.severity == severity)
    if priority:
        stmt = stmt.where(Defect.priority == priority)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Defect.code.ilike(like), Defect.title.ilike(like)))

    return list(db.execute(stmt.order_by(Defect.created_at.desc())).scalars().all())


@router.post("", response_model=DefectRead, status_code=status.HTTP_201_CREATED)
def create_defect(
    project_id: int,
    body: DefectCreate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Defect:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    _check_fk(db, project_id, body.module_id, body.requirement_id, body.test_case_id, body.execution_id)

    code = next_code(db, f"bug:{project_id}", "BUG", width=6)
    d = Defect(
        project_id=project_id,
        code=code,
        title=body.title.strip(),
        description=body.description,
        steps_to_reproduce=body.steps_to_reproduce,
        expected_result=body.expected_result,
        actual_result=body.actual_result,
        severity=body.severity,
        priority=body.priority,
        status=body.status,
        assigned_to=body.assigned_to,
        reported_by=user.id,
        module_id=body.module_id,
        requirement_id=body.requirement_id,
        test_case_id=body.test_case_id,
        execution_id=body.execution_id,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.get("/{defect_id}", response_model=DefectRead)
def get_defect(
    project_id: int,
    defect_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Defect:
    require_project_member(db, user, project_id)
    d = _defect(db, project_id, defect_id)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defect not found")
    return d


@router.patch("/{defect_id}", response_model=DefectRead)
def update_defect(
    project_id: int,
    defect_id: int,
    body: DefectUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Defect:
    require_project_admin(db, user, project_id)
    d = _defect(db, project_id, defect_id)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defect not found")

    data = body.model_dump(exclude_unset=True)
    if any(k in data for k in ("module_id", "requirement_id", "test_case_id", "execution_id")):
        mid = d.module_id if "module_id" not in data else data["module_id"]
        rid = d.requirement_id if "requirement_id" not in data else data["requirement_id"]
        tcid = d.test_case_id if "test_case_id" not in data else data["test_case_id"]
        eid = d.execution_id if "execution_id" not in data else data["execution_id"]
        _check_fk(db, project_id, mid, rid, tcid, eid)
    for k, v in data.items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/{defect_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_defect(
    project_id: int,
    defect_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> None:
    require_project_admin(db, user, project_id)
    d = _defect(db, project_id, defect_id)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defect not found")
    d.deleted_at = datetime.now(timezone.utc)
    db.commit()
