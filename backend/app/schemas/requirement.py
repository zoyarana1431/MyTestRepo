from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import RequirementPriority, RequirementStatus


class RequirementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    description: str | None = None
    module_id: int | None = None
    priority: RequirementPriority = RequirementPriority.medium
    status: RequirementStatus = RequirementStatus.draft
    source_reference: str | None = Field(None, max_length=512)
    tags: list[str] | None = None


class RequirementUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=512)
    description: str | None = None
    module_id: int | None = None
    priority: RequirementPriority | None = None
    status: RequirementStatus | None = None
    source_reference: str | None = Field(None, max_length=512)
    tags: list[str] | None = None


class RequirementRead(BaseModel):
    id: int
    project_id: int
    code: str
    title: str
    description: str | None
    module_id: int | None
    priority: str
    status: str
    source_reference: str | None
    tags: list[str] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RequirementListItem(RequirementRead):
    linked_test_case_count: int = 0


class LinkedTestCaseBrief(BaseModel):
    id: int
    code: str
    title: str
    status: str

    model_config = {"from_attributes": True}


class RequirementDetail(RequirementRead):
    test_cases: list[LinkedTestCaseBrief] = []


class RequirementTestCasesLink(BaseModel):
    test_case_ids: list[int] = Field(default_factory=list)
