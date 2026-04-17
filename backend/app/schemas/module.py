from datetime import datetime

from pydantic import BaseModel, Field


class ModuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    parent_id: int | None = None
    sort_order: int = 0


class ModuleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None


class ModuleRead(BaseModel):
    id: int
    project_id: int
    parent_id: int | None
    name: str
    description: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModuleTreeNode(ModuleRead):
    children: list["ModuleTreeNode"] = []


ModuleTreeNode.model_rebuild()
