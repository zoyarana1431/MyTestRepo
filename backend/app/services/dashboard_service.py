from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.defect import Defect
from app.models.execution import Execution
from app.models.execution_cycle import ExecutionCycle
from app.models.links import requirement_test_cases
from app.models.module import Module
from app.models.project import Project, ProjectMembership
from app.models.requirement import Requirement
from app.models.test_case import TestCase
from app.schemas.dashboard import (
    DashboardSummary,
    WorkspaceDashboard,
    WorkspaceProjectRow,
    WorkspaceRecentDefect,
    WorkspaceRecentExecution,
)
from app.services.rtm_service import CLOSED_DEFECT, RTMFilters


@dataclass
class DashboardFilters(RTMFilters):
    execution_status: str | None = None
    defect_severity: str | None = None
    defect_priority: str | None = None


def _execution_list_query(project_id: int, f: DashboardFilters):
    if f.module_id is not None:
        q = (
            select(Execution)
            .join(TestCase, Execution.test_case_id == TestCase.id)
            .where(Execution.project_id == project_id, TestCase.module_id == f.module_id)
        )
    else:
        q = select(Execution).where(Execution.project_id == project_id)
    if f.date_from:
        q = q.where(Execution.executed_at >= f.date_from)
    if f.date_to:
        q = q.where(Execution.executed_at <= f.date_to)
    if f.execution_cycle_id is not None:
        q = q.where(Execution.execution_cycle_id == f.execution_cycle_id)
    if f.execution_status:
        q = q.where(Execution.status == f.execution_status)
    return q


def build_dashboard(db: Session, project_id: int, f: DashboardFilters) -> DashboardSummary:
    reqs_total = int(
        db.execute(
            select(func.count()).select_from(Requirement).where(
                Requirement.project_id == project_id, Requirement.deleted_at.is_(None)
            )
        ).scalar_one()
        or 0
    )
    tc_total = int(
        db.execute(
            select(func.count()).select_from(TestCase).where(
                TestCase.project_id == project_id, TestCase.deleted_at.is_(None)
            )
        ).scalar_one()
        or 0
    )

    ex_rows = db.execute(_execution_list_query(project_id, f)).scalars().all()
    ex_total = len(ex_rows)

    status_counts: dict[str, int] = {}
    for e in ex_rows:
        status_counts[e.status] = status_counts.get(e.status, 0) + 1

    def pct(n: int) -> float:
        return round(100.0 * n / ex_total, 1) if ex_total else 0.0

    pass_n = status_counts.get("pass", 0)
    fail_n = status_counts.get("fail", 0)
    blocked_n = status_counts.get("blocked", 0)
    not_run_n = status_counts.get("not_run", 0)
    retest_n = status_counts.get("retest", 0)

    defect_q = select(Defect).where(Defect.project_id == project_id, Defect.deleted_at.is_(None))
    if f.defect_severity:
        defect_q = defect_q.where(Defect.severity == f.defect_severity)
    if f.defect_priority:
        defect_q = defect_q.where(Defect.priority == f.defect_priority)
    if f.module_id is not None:
        defect_q = defect_q.where(Defect.module_id == f.module_id)

    defects = db.execute(defect_q).scalars().all()
    d_open = sum(1 for d in defects if d.status not in CLOSED_DEFECT)
    d_closed = sum(1 for d in defects if d.status in CLOSED_DEFECT)

    sev: dict[str, int] = {}
    pri: dict[str, int] = {}
    for d in defects:
        sev[d.severity] = sev.get(d.severity, 0) + 1
        pri[d.priority] = pri.get(d.priority, 0) + 1

    reqs = db.execute(
        select(Requirement).where(Requirement.project_id == project_id, Requirement.deleted_at.is_(None))
    ).scalars().all()
    covered = 0
    for r in reqs:
        if f.module_id is not None and r.module_id != f.module_id:
            continue
        tc_ids = list(
            db.execute(
                select(requirement_test_cases.c.test_case_id).where(requirement_test_cases.c.requirement_id == r.id)
            ).scalars().all()
        )
        if not tc_ids:
            continue
        qe = select(Execution.id).where(
            Execution.project_id == project_id,
            Execution.test_case_id.in_(tc_ids),
            Execution.status == "pass",
        )
        if f.date_from:
            qe = qe.where(Execution.executed_at >= f.date_from)
        if f.date_to:
            qe = qe.where(Execution.executed_at <= f.date_to)
        if f.execution_cycle_id is not None:
            qe = qe.where(Execution.execution_cycle_id == f.execution_cycle_id)
        if db.execute(qe.limit(1)).first():
            covered += 1

    cov_pct = round(100.0 * covered / reqs_total, 1) if reqs_total else 0.0

    by_day: dict[str, int] = defaultdict(int)
    for e in ex_rows:
        by_day[e.executed_at.date().isoformat()] += 1
    executions_trend = [{"date": k, "count": v} for k, v in sorted(by_day.items())]

    modules = {m.id: m.name for m in db.execute(select(Module).where(Module.project_id == project_id)).scalars().all()}
    mod_stats: dict[int | None, dict[str, int]] = {}
    for e in ex_rows:
        tc = db.get(TestCase, e.test_case_id)
        mid = tc.module_id if tc else None
        if mid not in mod_stats:
            mod_stats[mid] = {"total": 0, "pass": 0, "fail": 0, "blocked": 0}
        mod_stats[mid]["total"] += 1
        if e.status == "pass":
            mod_stats[mid]["pass"] += 1
        elif e.status == "fail":
            mod_stats[mid]["fail"] += 1
        elif e.status == "blocked":
            mod_stats[mid]["blocked"] += 1

    module_execution_summary = [
        {
            "module_id": mid,
            "module_name": modules.get(mid) if mid is not None else "Unassigned",
            "total": v["total"],
            "pass": v["pass"],
            "fail": v["fail"],
            "blocked": v["blocked"],
        }
        for mid, v in sorted(mod_stats.items(), key=lambda x: (x[0] is None, x[0] or 0))
    ]

    return DashboardSummary(
        project_id=project_id,
        requirements_total=reqs_total,
        test_cases_total=tc_total,
        executions_total=ex_total,
        defects_open=d_open,
        defects_closed=d_closed,
        requirement_coverage_pct=cov_pct,
        execution_pass_pct=pct(pass_n),
        execution_fail_pct=pct(fail_n),
        execution_blocked_pct=pct(blocked_n),
        execution_not_run_pct=pct(not_run_n),
        execution_retest_pct=pct(retest_n),
        executions_by_status=status_counts,
        defects_by_severity=sev,
        defects_by_priority=pri,
        executions_trend=executions_trend,
        module_execution_summary=module_execution_summary,
    )


def _requirement_coverage_pair(db: Session, project_id: int) -> tuple[int, int]:
    """How many requirements have at least one passing execution on linked test cases."""
    reqs = db.execute(
        select(Requirement).where(Requirement.project_id == project_id, Requirement.deleted_at.is_(None))
    ).scalars().all()
    total = len(reqs)
    covered = 0
    for r in reqs:
        tc_ids = list(
            db.execute(
                select(requirement_test_cases.c.test_case_id).where(requirement_test_cases.c.requirement_id == r.id)
            ).scalars().all()
        )
        if not tc_ids:
            continue
        qe = select(Execution.id).where(
            Execution.project_id == project_id,
            Execution.test_case_id.in_(tc_ids),
            Execution.status == "pass",
        )
        if db.execute(qe.limit(1)).first():
            covered += 1
    return covered, total


def _execution_pass_pct_for_project(db: Session, project_id: int) -> tuple[int, float]:
    rows = db.execute(select(Execution).where(Execution.project_id == project_id)).scalars().all()
    n = len(rows)
    if not n:
        return 0, 0.0
    passes = sum(1 for e in rows if e.status == "pass")
    return n, round(100.0 * passes / n, 1)


def _test_case_title(tc: TestCase | None) -> str:
    if tc is None:
        return ""
    if tc.feature_name and tc.feature_name.strip():
        return tc.feature_name.strip()
    if tc.test_scenario and tc.test_scenario.strip():
        t = tc.test_scenario.strip()
        return t[:100] + ("…" if len(t) > 100 else "")
    return tc.code


def build_workspace_dashboard(db: Session, user_id: int, project_id_filter: int | None) -> WorkspaceDashboard:
    q = (
        select(Project.id)
        .join(ProjectMembership)
        .where(ProjectMembership.user_id == user_id)
    )
    if project_id_filter is not None:
        q = q.where(Project.id == project_id_filter)
    project_ids = [int(x) for x in db.execute(q).scalars().all()]

    if not project_ids:
        return WorkspaceDashboard(
            requirements_total=0,
            test_cases_total=0,
            executions_total=0,
            defects_total=0,
            defects_open=0,
            defects_closed=0,
            requirement_coverage_pct=0.0,
            execution_pass_pct=0.0,
            execution_fail_pct=0.0,
            execution_blocked_pct=0.0,
            execution_not_run_pct=0.0,
            execution_retest_pct=0.0,
            executions_by_status={},
            defects_by_severity={},
            active_run_cycles=0,
            active_projects=0,
            projects=[],
            recent_defects=[],
            recent_executions=[],
        )

    reqs_total = int(
        db.execute(
            select(func.count()).select_from(Requirement).where(
                Requirement.project_id.in_(project_ids), Requirement.deleted_at.is_(None)
            )
        ).scalar_one()
        or 0
    )
    tc_total = int(
        db.execute(
            select(func.count()).select_from(TestCase).where(
                TestCase.project_id.in_(project_ids), TestCase.deleted_at.is_(None)
            )
        ).scalar_one()
        or 0
    )
    ex_total = int(
        db.execute(select(func.count()).select_from(Execution).where(Execution.project_id.in_(project_ids))).scalar_one()
        or 0
    )

    status_rows = db.execute(
        select(Execution.status, func.count())
        .where(Execution.project_id.in_(project_ids))
        .group_by(Execution.status)
    ).all()
    executions_by_status: dict[str, int] = {str(s): int(c) for s, c in status_rows}

    def pct_status(key: str) -> float:
        return round(100.0 * executions_by_status.get(key, 0) / ex_total, 1) if ex_total else 0.0

    defects_all = db.execute(
        select(Defect).where(Defect.project_id.in_(project_ids), Defect.deleted_at.is_(None))
    ).scalars().all()
    defects_total = len(defects_all)
    d_open = sum(1 for d in defects_all if d.status not in CLOSED_DEFECT)
    d_closed = sum(1 for d in defects_all if d.status in CLOSED_DEFECT)
    sev: dict[str, int] = {}
    for d in defects_all:
        sev[d.severity] = sev.get(d.severity, 0) + 1

    cov_covered = 0
    cov_total = 0
    project_rows: list[WorkspaceProjectRow] = []
    projects = db.execute(select(Project).where(Project.id.in_(project_ids)).order_by(Project.created_at.asc())).scalars().all()
    active_projects = sum(1 for p in projects if p.status != "archived")

    for p in projects:
        c, t = _requirement_coverage_pair(db, p.id)
        cov_covered += c
        cov_total += t
        pr_reqs = int(
            db.execute(
                select(func.count()).select_from(Requirement).where(
                    Requirement.project_id == p.id, Requirement.deleted_at.is_(None)
                )
            ).scalar_one()
            or 0
        )
        pr_tcs = int(
            db.execute(
                select(func.count()).select_from(TestCase).where(
                    TestCase.project_id == p.id, TestCase.deleted_at.is_(None)
                )
            ).scalar_one()
            or 0
        )
        pr_ex_n, pr_pass_pct = _execution_pass_pct_for_project(db, p.id)
        row_cov = round(100.0 * c / t, 1) if t else 0.0
        project_rows.append(
            WorkspaceProjectRow(
                id=p.id,
                code=p.code,
                name=p.name,
                status=p.status,
                requirements_total=pr_reqs,
                test_cases_total=pr_tcs,
                executions_total=pr_ex_n,
                execution_pass_pct=pr_pass_pct,
                requirement_coverage_pct=row_cov,
            )
        )

    requirement_coverage_pct = round(100.0 * cov_covered / cov_total, 1) if cov_total else 0.0

    active_run_cycles = int(
        db.execute(
            select(func.count()).select_from(ExecutionCycle).where(
                ExecutionCycle.project_id.in_(project_ids), ExecutionCycle.status == "active"
            )
        ).scalar_one()
        or 0
    )

    recent_d = (
        db.execute(
            select(Defect)
            .where(Defect.project_id.in_(project_ids), Defect.deleted_at.is_(None))
            .order_by(Defect.created_at.desc())
            .limit(5)
        )
        .scalars()
        .all()
    )
    recent_defects = [
        WorkspaceRecentDefect(
            project_id=d.project_id,
            code=d.code,
            title=d.title,
            severity=d.severity,
            status=d.status,
            created_at=d.created_at,
        )
        for d in recent_d
    ]

    recent_e = (
        db.execute(
            select(Execution)
            .where(Execution.project_id.in_(project_ids))
            .order_by(Execution.executed_at.desc())
            .limit(5)
        )
        .scalars()
        .all()
    )
    recent_executions: list[WorkspaceRecentExecution] = []
    for e in recent_e:
        tc = db.get(TestCase, e.test_case_id)
        recent_executions.append(
            WorkspaceRecentExecution(
                project_id=e.project_id,
                code=e.code,
                test_case_code=tc.code if tc else "",
                test_case_title=_test_case_title(tc),
                status=e.status,
                executed_at=e.executed_at,
            )
        )

    return WorkspaceDashboard(
        requirements_total=reqs_total,
        test_cases_total=tc_total,
        executions_total=ex_total,
        defects_total=defects_total,
        defects_open=d_open,
        defects_closed=d_closed,
        requirement_coverage_pct=requirement_coverage_pct,
        execution_pass_pct=pct_status("pass"),
        execution_fail_pct=pct_status("fail"),
        execution_blocked_pct=pct_status("blocked"),
        execution_not_run_pct=pct_status("not_run"),
        execution_retest_pct=pct_status("retest"),
        executions_by_status=executions_by_status,
        defects_by_severity=sev,
        active_run_cycles=active_run_cycles,
        active_projects=active_projects,
        projects=project_rows,
        recent_defects=recent_defects,
        recent_executions=recent_executions,
    )
