from datetime import datetime

from pydantic import BaseModel


class AttachmentRead(BaseModel):
    id: int
    project_id: int
    execution_id: int | None
    defect_id: int | None
    original_filename: str
    content_type: str | None
    file_size: int
    uploaded_by: int | None
    uploaded_at: datetime

    model_config = {"from_attributes": True}
