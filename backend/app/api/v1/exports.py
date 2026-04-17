from datetime import date
from io import BytesIO
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db_session
from app.models.user import User
from app.services import export_service as ex

router = APIRouter(prefix="/exports", tags=["exports"])

ExportFormat = Literal["pdf", "xlsx"]


def _stream_bytes(data: bytes, media_type: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _filename(kind: str, export_format: ExportFormat, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> str:
    ext = "xlsx" if export_format == "xlsx" else "pdf"
    d = date.today().strftime("%Y-%m-%d")
    if not project_ids:
        return f"{kind}_no-projects_{d}.{ext}"
    if len(project_ids) == 1:
        code = pmap[project_ids[0]][0]
        return f"{kind}_{code}_{d}.{ext}"
    return f"{kind}_all-projects_{d}.{ext}"


def _resolve(db, user: User, project_id: int | None) -> tuple[list[int], dict[int, tuple[str, str]]]:
    resolved = ex.resolve_export_projects(db, user, project_id)
    if resolved is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of that project")
    pids, pmap = resolved
    return pids, pmap


@router.get("/requirements")
def export_requirements(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    export_format: ExportFormat = Query(..., alias="format"),
    project_id: int | None = Query(None, description="Scope to one project; omit for all accessible projects"),
):
    pids, pmap = _resolve(db, user, project_id)
    headers, rows = ex.requirements_table(db, pids, pmap)
    fn = _filename("requirements", export_format, pids, pmap)
    if export_format == "xlsx":
        data = ex.render_xlsx_bytes([("Requirements", headers, rows)])
        return _stream_bytes(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fn)
    data = ex.render_pdf_bytes("Requirements export", [("Requirements", headers, rows)])
    return _stream_bytes(data, "application/pdf", fn)


@router.get("/test-cases")
def export_test_cases(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    export_format: ExportFormat = Query(..., alias="format"),
    project_id: int | None = None,
):
    pids, pmap = _resolve(db, user, project_id)
    headers, rows = ex.test_cases_table(db, pids, pmap)
    fn = _filename("test_cases", export_format, pids, pmap)
    if export_format == "xlsx":
        data = ex.render_xlsx_bytes([("Test cases", headers, rows)])
        return _stream_bytes(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fn)
    data = ex.render_pdf_bytes("Test cases export", [("Test cases", headers, rows)])
    return _stream_bytes(data, "application/pdf", fn)


@router.get("/executions")
def export_executions(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    export_format: ExportFormat = Query(..., alias="format"),
    project_id: int | None = None,
):
    pids, pmap = _resolve(db, user, project_id)
    headers, rows = ex.executions_table(db, pids, pmap)
    fn = _filename("executions", export_format, pids, pmap)
    if export_format == "xlsx":
        data = ex.render_xlsx_bytes([("Executions", headers, rows)])
        return _stream_bytes(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fn)
    data = ex.render_pdf_bytes("Execution history", [("Executions", headers, rows)])
    return _stream_bytes(data, "application/pdf", fn)


@router.get("/defects")
def export_defects(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    export_format: ExportFormat = Query(..., alias="format"),
    project_id: int | None = None,
):
    pids, pmap = _resolve(db, user, project_id)
    headers, rows = ex.defects_table(db, pids, pmap)
    fn = _filename("defects", export_format, pids, pmap)
    if export_format == "xlsx":
        data = ex.render_xlsx_bytes([("Defects", headers, rows)])
        return _stream_bytes(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fn)
    data = ex.render_pdf_bytes("Defects report", [("Defects", headers, rows)])
    return _stream_bytes(data, "application/pdf", fn)


@router.get("/rtm")
def export_rtm(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    export_format: ExportFormat = Query(..., alias="format"),
    project_id: int | None = None,
):
    pids, pmap = _resolve(db, user, project_id)
    headers, rows = ex.rtm_table(db, pids, pmap)
    fn = _filename("rtm", export_format, pids, pmap)
    if export_format == "xlsx":
        data = ex.render_xlsx_bytes([("RTM", headers, rows)])
        return _stream_bytes(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fn)
    data = ex.render_pdf_bytes("Requirement traceability (RTM)", [("RTM", headers, rows)])
    return _stream_bytes(data, "application/pdf", fn)


@router.get("/dashboard-summary")
def export_dashboard_summary(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    export_format: ExportFormat = Query(..., alias="format"),
    project_id: int | None = None,
):
    pids, pmap = _resolve(db, user, project_id)
    headers, rows = ex.dashboard_summary_table(db, user, pids, pmap)
    fn = _filename("dashboard_summary", export_format, pids, pmap)
    if export_format == "xlsx":
        data = ex.render_xlsx_bytes([("Dashboard summary", headers, rows)])
        return _stream_bytes(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fn)
    data = ex.render_pdf_bytes("Dashboard summary", [("Summary", headers, rows)])
    return _stream_bytes(data, "application/pdf", fn)


@router.get("/full-workbook")
def export_full_workbook(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    export_format: ExportFormat = Query(..., alias="format"),
    project_id: int | None = None,
):
    pids, pmap = _resolve(db, user, project_id)
    fn = _filename("project_workbook", export_format, pids, pmap)
    sheets = ex.full_workbook_sheets(db, user, pids, pmap)
    if export_format == "xlsx":
        data = ex.render_xlsx_bytes([(t, h, r) for t, h, r in sheets])
        return _stream_bytes(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fn)
    data = ex.render_pdf_bytes("Full project workbook (condensed)", [(t, h, r) for t, h, r in sheets])
    return _stream_bytes(data, "application/pdf", fn)
