import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import CurrentUser, get_db_session, get_project_or_404, require_project_admin, require_project_member
from app.models.attachment import Attachment
from app.models.defect import Defect
from app.models.execution import Execution
from app.schemas.attachment import AttachmentRead
from app.services.storage import absolute_path, save_upload_file

router = APIRouter(prefix="/projects/{project_id}", tags=["attachments"])


def _attachment(db: Session, project_id: int, attachment_id: int) -> Attachment | None:
    a = db.get(Attachment, attachment_id)
    if a is None or a.project_id != project_id:
        return None
    return a


@router.post(
    "/executions/{execution_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_execution_attachment(
    project_id: int,
    execution_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    file: UploadFile = File(...),
) -> Attachment:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    ex = db.get(Execution, execution_id)
    if ex is None or ex.project_id != project_id:
        raise HTTPException(status_code=404, detail="Execution not found")

    try:
        rel, size, ctype = await save_upload_file(project_id, file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    att = Attachment(
        project_id=project_id,
        execution_id=execution_id,
        defect_id=None,
        original_filename=file.filename or "file",
        content_type=ctype,
        file_size=size,
        storage_path=rel,
        uploaded_by=user.id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


@router.post(
    "/defects/{defect_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_defect_attachment(
    project_id: int,
    defect_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    file: UploadFile = File(...),
) -> Attachment:
    require_project_admin(db, user, project_id)
    get_project_or_404(db, project_id)
    d = db.get(Defect, defect_id)
    if d is None or d.project_id != project_id or d.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Defect not found")

    try:
        rel, size, ctype = await save_upload_file(project_id, file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    att = Attachment(
        project_id=project_id,
        execution_id=None,
        defect_id=defect_id,
        original_filename=file.filename or "file",
        content_type=ctype,
        file_size=size,
        storage_path=rel,
        uploaded_by=user.id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


@router.get("/attachments/{attachment_id}", response_model=AttachmentRead)
def get_attachment_meta(
    project_id: int,
    attachment_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> Attachment:
    require_project_member(db, user, project_id)
    a = _attachment(db, project_id, attachment_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return a


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    project_id: int,
    attachment_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
):
    require_project_member(db, user, project_id)
    a = _attachment(db, project_id, attachment_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    path = absolute_path(a.storage_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing on disk")
    media = a.content_type or mimetypes.guess_type(a.original_filename)[0] or "application/octet-stream"
    return FileResponse(
        path,
        filename=a.original_filename,
        media_type=media,
    )


@router.get("/executions/{execution_id}/attachments", response_model=list[AttachmentRead])
def list_execution_attachments(
    project_id: int,
    execution_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> list[Attachment]:
    require_project_member(db, user, project_id)
    ex = db.get(Execution, execution_id)
    if ex is None or ex.project_id != project_id:
        raise HTTPException(status_code=404, detail="Execution not found")
    rows = db.execute(
        select(Attachment).where(Attachment.project_id == project_id, Attachment.execution_id == execution_id)
    ).scalars().all()
    return list(rows)


@router.get("/defects/{defect_id}/attachments", response_model=list[AttachmentRead])
def list_defect_attachments(
    project_id: int,
    defect_id: int,
    user: CurrentUser,
    db: Session = Depends(get_db_session),
) -> list[Attachment]:
    require_project_member(db, user, project_id)
    d = db.get(Defect, defect_id)
    if d is None or d.project_id != project_id or d.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Defect not found")
    rows = db.execute(
        select(Attachment).where(Attachment.project_id == project_id, Attachment.defect_id == defect_id)
    ).scalars().all()
    return list(rows)
