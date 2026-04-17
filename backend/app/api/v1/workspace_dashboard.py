from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session, get_project_membership
from app.schemas.dashboard import WorkspaceDashboard
from app.services.dashboard_service import build_workspace_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/workspace", response_model=WorkspaceDashboard)
def get_workspace_dashboard(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    project_id: int | None = Query(
        None,
        description="When set, aggregate only this project (must be a member).",
    ),
) -> WorkspaceDashboard:
    if project_id is not None and get_project_membership(db, user.id, project_id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this project")
    return build_workspace_dashboard(db, user.id, project_id)
