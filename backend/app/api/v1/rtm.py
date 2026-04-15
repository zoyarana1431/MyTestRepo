from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_member
from app.schemas.rtm import RTMModuleRow, RTMProjectSummary, RTMRequirementRow
from app.services.rtm_service import RTMFilters, rtm_by_module, rtm_by_requirement, rtm_project_summary

router = APIRouter(prefix="/projects/{project_id}/rtm", tags=["rtm"])


def _parse_dt(v: str | None) -> datetime | None:
    if not v:
        return None
    return datetime.fromisoformat(v.replace("Z", "+00:00"))


def _filters(
    module_id: int | None,
    date_from: str | None,
    date_to: str | None,
    execution_cycle_id: int | None,
) -> RTMFilters:
    return RTMFilters(
        module_id=module_id,
        date_from=_parse_dt(date_from),
        date_to=_parse_dt(date_to),
        execution_cycle_id=execution_cycle_id,
    )


@router.get("/requirements", response_model=list[RTMRequirementRow])
def rtm_requirements(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    module_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    execution_cycle_id: int | None = None,
) -> list[RTMRequirementRow]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)
    return rtm_by_requirement(db, project_id, _filters(module_id, date_from, date_to, execution_cycle_id))


@router.get("/modules", response_model=list[RTMModuleRow])
def rtm_modules(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    module_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    execution_cycle_id: int | None = None,
) -> list[RTMModuleRow]:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)
    return rtm_by_module(db, project_id, _filters(module_id, date_from, date_to, execution_cycle_id))


@router.get("/project-summary", response_model=RTMProjectSummary)
def rtm_project(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    module_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    execution_cycle_id: int | None = None,
) -> RTMProjectSummary:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)
    return rtm_project_summary(db, project_id, _filters(module_id, date_from, date_to, execution_cycle_id))
