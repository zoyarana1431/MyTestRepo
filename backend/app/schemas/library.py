from pydantic import BaseModel, Field


class ReusableLibraryItem(BaseModel):
    """Cross-project reusable test case for the library view."""

    id: int
    library_code: str = Field(description="Stable display id, e.g. LIB-042")
    project_id: int
    project_code: str
    project_name: str
    title: str
    category_line: str = Field(description="Short line, e.g. Module — scenario")
    description: str | None
    test_type: str
    priority: str
    tags: list[str] | None
    preconditions: str | None
