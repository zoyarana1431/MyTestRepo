from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token, get_password_hash
from app.db.session import get_db as get_db_session
from app.models.enums import ProjectRole
from app.models.project import Project, ProjectMembership
from app.models.user import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    db: Annotated[Session, Depends(get_db_session)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> User:
    if creds is None or not creds.credentials:
        # Dev-friendly fallback: if no bearer token is sent, reuse the first active
        # user or create a local default user so the app can be accessed directly.
        user = db.execute(select(User).where(User.is_active.is_(True)).order_by(User.id.asc())).scalar_one_or_none()
        if user is not None:
            return user
        user = User(
            email="local@qatm.dev",
            hashed_password=get_password_hash("local-dev-password"),
            full_name="Local User",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    payload = decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_project_membership(
    db: Session,
    user_id: int,
    project_id: int,
) -> ProjectMembership | None:
    return db.execute(
        select(ProjectMembership).where(
            ProjectMembership.user_id == user_id,
            ProjectMembership.project_id == project_id,
        )
    ).scalar_one_or_none()


def require_project_member(
    db: Session,
    user: User,
    project_id: int,
) -> ProjectMembership:
    m = get_project_membership(db, user.id, project_id)
    if m is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this project")
    return m


def require_project_admin(
    db: Session,
    user: User,
    project_id: int,
) -> ProjectMembership:
    m = require_project_member(db, user, project_id)
    if m.role != ProjectRole.admin.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return m


def get_project_or_404(db: Session, project_id: int) -> Project:
    p = db.get(Project, project_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return p
