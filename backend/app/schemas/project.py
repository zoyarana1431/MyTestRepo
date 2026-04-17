import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ProjectRole, ProjectStatus

_PROJECT_CODE_RE = re.compile(r"^[A-Z][A-Z0-9-]{1,30}$")


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    client_company: str | None = None
    release_version: str | None = None
    code: str | None = Field(None, max_length=32, description="Optional; API assigns next PRJ-### if omitted")
    status: ProjectStatus = ProjectStatus.active

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        if v is None or not str(v).strip():
            return None
        c = str(v).strip().upper()
        if not _PROJECT_CODE_RE.match(c):
            raise ValueError("Project code must look like PRJ-001 (letters, digits, hyphens)")
        return c


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


class ProjectListItem(ProjectRead):
    test_cases_count: int = 0
    pass_rate_pct: float = 0.0
    open_defects_count: int = 0


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
