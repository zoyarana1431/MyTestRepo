from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import (
    CurrentUser,
    get_db_session,
    get_project_or_404,
    get_project_membership,
    require_project_admin,
    require_project_member,
)
from app.models.enums import ProjectRole, ProjectStatus
from app.models.project import Project, ProjectMembership
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberInvite,
    ProjectMemberRoleUpdate,
    ProjectMemberWithUserRead,
    ProjectRead,
    ProjectUpdate,
)
from app.services.id_generator import next_code

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
def list_projects(user: CurrentUser, db: Session = Depends(get_db_session)) -> list[Project]:
    q = (
        select(Project)
        .join(ProjectMembership)
        .where(ProjectMembership.user_id == user.id)
        .order_by(Project.created_at.desc())
    )
    return list(db.execute(q).scalars().all())


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, user: CurrentUser, db: Session = Depends(get_db_session)) -> Project:
    code = next_code(db, "project", "PRJ", width=3)
    project = Project(
        code=code,
        name=body.name,
        description=body.description,
        client_company=body.client_company,
        release_version=body.release_version,
        status=ProjectStatus.active.value,
    )
    db.add(project)
    db.flush()
    db.add(
        ProjectMembership(
            user_id=user.id,
            project_id=project.id,
            role=ProjectRole.admin.value,
        )
    )
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Project:
    require_project_member(db, user, project_id)
    return get_project_or_404(db, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Project:
    require_project_admin(db, user, project_id)
    project = get_project_or_404(db, project_id)
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        st = data["status"]
        if isinstance(st, ProjectStatus):
            data["status"] = st.value
        if data["status"] == ProjectStatus.archived.value:
            project.archived_at = datetime.now(timezone.utc)
        elif data["status"] == ProjectStatus.active.value:
            project.archived_at = None
    for k, v in data.items():
        setattr(project, k, v)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> None:
    require_project_admin(db, user, project_id)
    project = get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()


@router.get("/{project_id}/members", response_model=list[ProjectMemberWithUserRead])
def list_members(
    project_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> list[ProjectMemberWithUserRead]:
    require_project_member(db, user, project_id)
    rows = db.execute(
        select(ProjectMembership, User)
        .join(User, User.id == ProjectMembership.user_id)
        .where(ProjectMembership.project_id == project_id)
        .order_by(User.email)
    ).all()
    out: list[ProjectMemberWithUserRead] = []
    for m, u in rows:
        out.append(
            ProjectMemberWithUserRead(
                user_id=m.user_id,
                email=u.email,
                full_name=u.full_name,
                project_id=m.project_id,
                role=ProjectRole(m.role),
            )
        )
    return out


@router.post("/{project_id}/members", response_model=ProjectMemberWithUserRead, status_code=status.HTTP_201_CREATED)
def invite_member(
    project_id: int,
    body: ProjectMemberInvite,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> ProjectMemberWithUserRead:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    target = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found with this email")
    existing = get_project_membership(db, target.id, project_id)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already a member")
    m = ProjectMembership(
        user_id=target.id,
        project_id=project_id,
        role=body.role.value,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return ProjectMemberWithUserRead(
        user_id=m.user_id,
        email=target.email,
        full_name=target.full_name,
        project_id=m.project_id,
        role=ProjectRole(m.role),
    )


@router.patch("/{project_id}/members/{member_user_id}", response_model=ProjectMemberWithUserRead)
def update_member_role(
    project_id: int,
    member_user_id: int,
    body: ProjectMemberRoleUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> ProjectMemberWithUserRead:
    require_project_admin(db, user, project_id)
    m = get_project_membership(db, member_user_id, project_id)
    if m is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    if member_user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role here")
    m.role = body.role.value
    db.commit()
    db.refresh(m)
    target = db.get(User, member_user_id)
    assert target is not None
    return ProjectMemberWithUserRead(
        user_id=m.user_id,
        email=target.email,
        full_name=target.full_name,
        project_id=m.project_id,
        role=ProjectRole(m.role),
    )
