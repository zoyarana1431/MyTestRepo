from datetime import datetime

from pydantic import BaseModel, Field


class ExecutionCreate(BaseModel):
    test_case_id: int
    requirement_id: int | None = None
    execution_cycle_id: int | None = None
    build_version: str | None = Field(None, max_length=128)
    platform: str | None = Field(None, max_length=255)
    environment: str | None = Field(None, max_length=255)
    executed_at: datetime | None = None
    status: str = Field(..., description="pass|fail|blocked|not_run|retest")
    actual_result: str | None = None
    retest_required: bool = False
    retest_at: datetime | None = None
    final_status: str | None = None
    comments: str | None = None


class ExecutionRead(BaseModel):
    id: int
    project_id: int
    code: str
    test_case_id: int
    requirement_id: int | None
    execution_cycle_id: int | None
    build_version: str | None
    platform: str | None
    environment: str | None
    executed_by: int | None
    executed_at: datetime
    status: str
    actual_result: str | None
    retest_required: bool
    retest_at: datetime | None
    final_status: str | None
    comments: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExecutionListItem(ExecutionRead):
    test_case_code: str = ""
    test_case_title: str = ""
    execution_cycle_code: str | None = None
    execution_cycle_name: str | None = None
