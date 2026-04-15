from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ProjectRole, ProjectStatus


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    client_company: str | None = None
    release_version: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    client_company: str | None = None
    release_version: str | None = None
    status: ProjectStatus | None = None


class ProjectRead(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    client_company: str | None
    release_version: str | None
    status: str
    archived_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectMembershipRead(BaseModel):
    user_id: int
    project_id: int
    role: ProjectRole

    model_config = {"from_attributes": True}


class ProjectMemberWithUserRead(BaseModel):
    user_id: int
    email: str
    full_name: str | None
    project_id: int
    role: ProjectRole


class ProjectMemberInvite(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    role: ProjectRole = ProjectRole.viewer


class ProjectMemberRoleUpdate(BaseModel):
    role: ProjectRole
