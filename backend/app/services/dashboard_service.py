from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.defect import Defect
from app.models.execution import Execution
from app.models.links import requirement_test_cases
from app.models.module import Module
from app.models.requirement import Requirement
from app.models.test_case import TestCase
from app.schemas.dashboard import DashboardSummary
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
