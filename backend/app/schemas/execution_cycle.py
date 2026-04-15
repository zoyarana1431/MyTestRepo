from datetime import datetime

from pydantic import BaseModel, Field


class ExecutionCycleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    build_version: str | None = Field(None, max_length=128)
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str = "planned"


class ExecutionCycleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    build_version: str | None = Field(None, max_length=128)
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str | None = None


class ExecutionCycleRead(BaseModel):
    id: int
    project_id: int
    code: str
    name: str
    build_version: str | None
    description: str | None
    start_date: datetime | None
    end_date: datetime | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
