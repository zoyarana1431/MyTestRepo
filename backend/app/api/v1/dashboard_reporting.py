from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_member
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardFilters, build_dashboard

router = APIRouter(prefix="/projects/{project_id}", tags=["dashboard"])


def _parse_dt(v: str | None) -> datetime | None:
    if not v:
        return None
    return datetime.fromisoformat(v.replace("Z", "+00:00"))


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    module_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    execution_cycle_id: int | None = None,
    execution_status: str | None = None,
    defect_severity: str | None = None,
    defect_priority: str | None = None,
) -> DashboardSummary:
    require_project_member(db, user, project_id)
    get_project_or_404(db, project_id)

    f = DashboardFilters(
        module_id=module_id,
        date_from=_parse_dt(date_from),
        date_to=_parse_dt(date_to),
        execution_cycle_id=execution_cycle_id,
        execution_status=execution_status,
        defect_severity=defect_severity,
        defect_priority=defect_priority,
    )
    return build_dashboard(db, project_id, f)
