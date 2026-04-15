from datetime import datetime

from pydantic import BaseModel, Field


class DefectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    description: str | None = None
    steps_to_reproduce: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    severity: str
    priority: str
    status: str = "open"
    assigned_to: int | None = None
    module_id: int | None = None
    requirement_id: int | None = None
    test_case_id: int | None = None
    execution_id: int | None = None


class DefectUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=512)
    description: str | None = None
    steps_to_reproduce: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    severity: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_to: int | None = None
    module_id: int | None = None
    requirement_id: int | None = None
    test_case_id: int | None = None
    execution_id: int | None = None


class DefectRead(BaseModel):
    id: int
    project_id: int
    code: str
    title: str
    description: str | None
    steps_to_reproduce: str | None
    expected_result: str | None
    actual_result: str | None
    severity: str
    priority: str
    status: str
    assigned_to: int | None
    reported_by: int | None
    module_id: int | None
    requirement_id: int | None
    test_case_id: int | None
    execution_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
