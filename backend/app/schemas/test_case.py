from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import RequirementPriority, Severity, TestCaseStatus, TestCaseType


class TestCaseStepCreate(BaseModel):
    step_number: int = Field(ge=1)
    action: str = Field(min_length=1)
    test_data: str | None = None
    expected_result: str | None = None


class TestCaseStepRead(BaseModel):
    id: int
    test_case_id: int
    step_number: int
    action: str
    test_data: str | None
    expected_result: str | None

    model_config = {"from_attributes": True}


class TestCaseCreate(BaseModel):
    module_id: int | None = None
    feature_name: str | None = Field(None, max_length=255)
    test_scenario: str | None = None
    description: str | None = None
    test_type: TestCaseType = TestCaseType.functional
    priority: RequirementPriority = RequirementPriority.medium
    severity: Severity = Severity.major
    preconditions: str | None = None
    expected_result_summary: str | None = None
    platform: str | None = None
    environment: str | None = None
    tags: list[str] | None = None
    is_reusable: bool = False
    status: TestCaseStatus = TestCaseStatus.draft
    requirement_ids: list[int] = Field(default_factory=list)
    steps: list[TestCaseStepCreate] = Field(default_factory=list)

    @field_validator("steps")
    @classmethod
    def sort_steps(cls, v: list[TestCaseStepCreate]) -> list[TestCaseStepCreate]:
        return sorted(v, key=lambda s: s.step_number)


class TestCaseUpdate(BaseModel):
    module_id: int | None = None
    feature_name: str | None = Field(None, max_length=255)
    test_scenario: str | None = None
    description: str | None = None
    test_type: TestCaseType | None = None
    priority: RequirementPriority | None = None
    severity: Severity | None = None
    preconditions: str | None = None
    expected_result_summary: str | None = None
    platform: str | None = None
    environment: str | None = None
    tags: list[str] | None = None
    is_reusable: bool | None = None
    status: TestCaseStatus | None = None
    requirement_ids: list[int] | None = None
    steps: list[TestCaseStepCreate] | None = None


class TestCaseRead(BaseModel):
    id: int
    project_id: int
    code: str
    module_id: int | None
    feature_name: str | None
    test_scenario: str | None
    description: str | None
    test_type: str
    priority: str
    severity: str
    preconditions: str | None
    expected_result_summary: str | None
    platform: str | None
    environment: str | None
    tags: list[str] | None
    is_reusable: bool
    status: str
    created_by: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LinkedRequirementBrief(BaseModel):
    id: int
    code: str
    title: str
    status: str

    model_config = {"from_attributes": True}


class TestCaseListItem(TestCaseRead):
    linked_requirement_count: int = 0
    step_count: int = 0


class TestCaseDetail(TestCaseRead):
    steps: list[TestCaseStepRead] = []
    requirements: list[LinkedRequirementBrief] = []
