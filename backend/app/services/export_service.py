"""Build tabular export data and render PDF / Excel for workspace reports."""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Any, Literal
from xml.sax.saxutils import escape

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.defect import Defect
from app.models.execution import Execution
from app.models.execution_cycle import ExecutionCycle
from app.models.links import requirement_test_cases
from app.models.module import Module
from app.models.project import Project, ProjectMembership
from app.models.requirement import Requirement
from app.models.test_case import TestCase, TestCaseStep
from app.models.user import User
from app.services.dashboard_service import DashboardFilters, build_dashboard
from app.services.rtm_service import RTMFilters, rtm_by_requirement

ExportFormat = Literal["pdf", "xlsx"]


def _cell(v: Any) -> Any:
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, bool):
        return "yes" if v else "no"
    return v


def _pdf_cell(v: Any) -> str:
    return str(_cell(v)).replace("\n", " ").replace("\r", "")[:800]


def member_project_ids(db: Session, user_id: int) -> list[int]:
    return list(
        db.execute(select(Project.id).join(ProjectMembership).where(ProjectMembership.user_id == user_id)).scalars().all()
    )


def resolve_export_projects(
    db: Session, user: User, project_id: int | None
) -> tuple[list[int], dict[int, tuple[str, str]]] | None:
    ids = member_project_ids(db, user.id)
    if not ids:
        return [], {}
    projects = db.execute(select(Project).where(Project.id.in_(ids))).scalars().all()
    pmap = {p.id: (p.code, p.name) for p in projects}
    if project_id is not None:
        if project_id not in pmap:
            return None
        return [project_id], pmap
    return ids, pmap


def requirements_table(db: Session, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Project code",
        "Project name",
        "Requirement code",
        "Title",
        "Priority",
        "Status",
        "Linked test cases",
        "Source reference",
        "Description",
    ]
    rows: list[list[Any]] = []
    cnt = func.count(requirement_test_cases.c.test_case_id).label("tc_count")
    for pid in project_ids:
        pc, pn = pmap[pid]
        stmt = (
            select(Requirement, cnt)
            .outerjoin(requirement_test_cases, Requirement.id == requirement_test_cases.c.requirement_id)
            .where(Requirement.project_id == pid, Requirement.deleted_at.is_(None))
            .group_by(Requirement.id)
            .order_by(Requirement.code)
        )
        for r, tc_count in db.execute(stmt).all():
            rows.append(
                [
                    pc,
                    pn,
                    r.code,
                    r.title,
                    r.priority,
                    r.status,
                    int(tc_count or 0),
                    r.source_reference or "",
                    (r.description or "")[:2000],
                ]
            )
    return headers, rows


def test_cases_table(db: Session, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Project code",
        "Project name",
        "Test case code",
        "Feature",
        "Scenario",
        "Type",
        "Priority",
        "Severity",
        "Status",
        "Reusable",
        "Step count",
        "Preconditions",
        "Description",
    ]
    rows: list[list[Any]] = []
    for pid in project_ids:
        pc, pn = pmap[pid]
        tcs = db.execute(select(TestCase).where(TestCase.project_id == pid, TestCase.deleted_at.is_(None))).scalars().all()
        for tc in tcs:
            sc = (
                db.execute(select(func.count()).select_from(TestCaseStep).where(TestCaseStep.test_case_id == tc.id)).scalar_one()
                or 0
            )
            rows.append(
                [
                    pc,
                    pn,
                    tc.code,
                    tc.feature_name or "",
                    (tc.test_scenario or "")[:1500],
                    tc.test_type,
                    tc.priority,
                    tc.severity,
                    tc.status,
                    tc.is_reusable,
                    int(sc),
                    (tc.preconditions or "")[:2000],
                    (tc.description or "")[:2000],
                ]
            )
    return headers, rows


def executions_table(db: Session, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Project code",
        "Project name",
        "Execution code",
        "Test case code",
        "Cycle code",
        "Cycle name",
        "Executed at",
        "Status",
        "Retest required",
        "Actual result",
        "Comments",
    ]
    rows: list[list[Any]] = []
    for pid in project_ids:
        pc, pn = pmap[pid]
        exs = (
            db.execute(select(Execution).where(Execution.project_id == pid).order_by(Execution.executed_at.desc()))
            .scalars()
            .all()
        )
        for e in exs:
            tc = db.get(TestCase, e.test_case_id)
            cyc = db.get(ExecutionCycle, e.execution_cycle_id) if e.execution_cycle_id else None
            rows.append(
                [
                    pc,
                    pn,
                    e.code,
                    tc.code if tc else "",
                    cyc.code if cyc else "",
                    cyc.name if cyc else "",
                    e.executed_at,
                    e.status,
                    e.retest_required,
                    (e.actual_result or "")[:2000],
                    (e.comments or "")[:2000],
                ]
            )
    return headers, rows


def defects_table(db: Session, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Project code",
        "Project name",
        "Defect code",
        "Title",
        "Severity",
        "Priority",
        "Status",
        "Description",
        "Created at",
    ]
    rows: list[list[Any]] = []
    for pid in project_ids:
        pc, pn = pmap[pid]
        defs = (
            db.execute(select(Defect).where(Defect.project_id == pid, Defect.deleted_at.is_(None)).order_by(Defect.code))
            .scalars()
            .all()
        )
        for d in defs:
            rows.append(
                [
                    pc,
                    pn,
                    d.code,
                    d.title,
                    d.severity,
                    d.priority,
                    d.status,
                    (d.description or "")[:2000],
                    d.created_at,
                ]
            )
    return headers, rows


def rtm_table(db: Session, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Project code",
        "Project name",
        "Req code",
        "Requirement",
        "Module",
        "Linked TCs",
        "Executions",
        "Pass",
        "Fail",
        "Blocked",
        "Not run",
        "Retest",
        "Open defects",
        "Closed defects",
        "Coverage %",
        "Latest status",
    ]
    rows: list[list[Any]] = []
    f = RTMFilters()
    for pid in project_ids:
        pc, pn = pmap[pid]
        for r in rtm_by_requirement(db, pid, f):
            rows.append(
                [
                    pc,
                    pn,
                    r.code,
                    r.title,
                    r.module_name or "",
                    r.linked_test_case_count,
                    r.execution_count,
                    r.pass_count,
                    r.fail_count,
                    r.blocked_count,
                    r.not_run_count,
                    r.retest_count,
                    r.open_defects,
                    r.closed_defects,
                    r.coverage_pct,
                    r.latest_status or "",
                ]
            )
    return headers, rows


def dashboard_summary_table(db: Session, user: User, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = [
        "Project code",
        "Project name",
        "Requirements",
        "Test cases",
        "Executions",
        "Defects open",
        "Defects closed",
        "Req coverage %",
        "Exec pass %",
        "Exec fail %",
        "Exec blocked %",
    ]
    rows: list[list[Any]] = []
    f = DashboardFilters()
    for pid in project_ids:
        pc, pn = pmap[pid]
        d = build_dashboard(db, pid, f)
        rows.append(
            [
                pc,
                pn,
                d.requirements_total,
                d.test_cases_total,
                d.executions_total,
                d.defects_open,
                d.defects_closed,
                d.requirement_coverage_pct,
                d.execution_pass_pct,
                d.execution_fail_pct,
                d.execution_blocked_pct,
            ]
        )
    return headers, rows


def modules_table(db: Session, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = ["Project code", "Project name", "Module id", "Parent id", "Name", "Description", "Sort order"]
    rows: list[list[Any]] = []
    for pid in project_ids:
        pc, pn = pmap[pid]
        mods = db.execute(select(Module).where(Module.project_id == pid).order_by(Module.sort_order)).scalars().all()
        for m in mods:
            desc = getattr(m, "description", None) or ""
            rows.append([pc, pn, m.id, m.parent_id or "", m.name, desc, m.sort_order])
    return headers, rows


def execution_cycles_table(db: Session, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> tuple[list[str], list[list[Any]]]:
    headers = ["Project code", "Project name", "Cycle code", "Name", "Status", "Build", "Start", "End"]
    rows: list[list[Any]] = []
    for pid in project_ids:
        pc, pn = pmap[pid]
        cycs = db.execute(select(ExecutionCycle).where(ExecutionCycle.project_id == pid).order_by(ExecutionCycle.code)).scalars().all()
        for c in cycs:
            rows.append([pc, pn, c.code, c.name, c.status, c.build_version or "", c.start_date or "", c.end_date or ""])
    return headers, rows


def render_xlsx_bytes(sheets: list[tuple[str, list[str], list[list[Any]]]]) -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    first = True
    for title, headers, rows in sheets:
        name = (title or "Sheet")[:31]
        if first:
            ws = wb.active
            ws.title = name
            first = False
        else:
            ws = wb.create_sheet(name)
        ws.append([_cell(h) for h in headers])
        for r in rows:
            ws.append([_cell(c) for c in r])
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_pdf_bytes(doc_title: str, sections: list[tuple[str, list[str], list[list[Any]]]], max_rows: int = 120) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        rightMargin=28,
        leftMargin=28,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    story: list[Any] = []
    story.append(Paragraph(escape(doc_title), styles["Title"]))
    story.append(Spacer(1, 14))
    for sec_title, headers, rows in sections:
        story.append(Paragraph(escape(sec_title), styles["Heading2"]))
        story.append(Spacer(1, 6))
        slice_rows = rows[:max_rows]
        data: list[list[str]] = [[_pdf_cell(h) for h in headers]]
        for row in slice_rows:
            data.append([_pdf_cell(c) for c in row])
        if len(rows) > max_rows:
            data.append([f"... {_pdf_cell(len(rows) - max_rows)} more rows not shown ..."] + [""] * (len(headers) - 1))
        t = Table(data, repeatRows=1, hAlign="LEFT")
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 6),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                    ("GRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#cbd5e1")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 16))
    doc.build(story)
    return buf.getvalue()


def full_workbook_sheets(db: Session, user: User, project_ids: list[int], pmap: dict[int, tuple[str, str]]) -> list[tuple[str, list[str], list[list[Any]]]]:
    out: list[tuple[str, list[str], list[list[Any]]]] = []
    h, r = dashboard_summary_table(db, user, project_ids, pmap)
    out.append(("Summary", h, r))
    out.append(("Requirements", *requirements_table(db, project_ids, pmap)))
    out.append(("TestCases", *test_cases_table(db, project_ids, pmap)))
    out.append(("Modules", *modules_table(db, project_ids, pmap)))
    out.append(("ExecutionCycles", *execution_cycles_table(db, project_ids, pmap)))
    out.append(("Executions", *executions_table(db, project_ids, pmap)))
    out.append(("Defects", *defects_table(db, project_ids, pmap)))
    out.append(("RTM", *rtm_table(db, project_ids, pmap)))
    return out
