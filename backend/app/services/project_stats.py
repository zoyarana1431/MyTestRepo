from sqlalchemy import func, not_, select
from sqlalchemy.orm import Session

from app.models.defect import Defect
from app.models.execution import Execution
from app.models.test_case import TestCase
from app.services.rtm_service import CLOSED_DEFECT


def project_card_stats_map(db: Session, project_ids: list[int]) -> dict[int, tuple[int, float, int]]:
    """For each project_id: (test_case_count, pass_rate_pct, open_defect_count)."""
    if not project_ids:
        return {}

    tc_rows = db.execute(
        select(TestCase.project_id, func.count())
        .where(TestCase.project_id.in_(project_ids), TestCase.deleted_at.is_(None))
        .group_by(TestCase.project_id)
    ).all()
    tc_map = {int(pid): int(c) for pid, c in tc_rows}

    ex_rows = db.execute(
        select(Execution.project_id, Execution.status, func.count())
        .where(Execution.project_id.in_(project_ids))
        .group_by(Execution.project_id, Execution.status)
    ).all()
    ex_by_project: dict[int, dict[str, int]] = {}
    for pid, st, c in ex_rows:
        pid = int(pid)
        if pid not in ex_by_project:
            ex_by_project[pid] = {}
        ex_by_project[pid][str(st)] = int(c)

    def pass_rate(pid: int) -> float:
        m = ex_by_project.get(pid, {})
        total = sum(m.values())
        if not total:
            return 0.0
        passes = m.get("pass", 0)
        return round(100.0 * passes / total, 0)

    open_def_rows = db.execute(
        select(Defect.project_id, func.count())
        .where(
            Defect.project_id.in_(project_ids),
            Defect.deleted_at.is_(None),
            not_(Defect.status.in_(list(CLOSED_DEFECT))),
        )
        .group_by(Defect.project_id)
    ).all()
    bug_map = {int(pid): int(c) for pid, c in open_def_rows}

    out: dict[int, tuple[int, float, int]] = {}
    for pid in project_ids:
        out[pid] = (tc_map.get(pid, 0), pass_rate(pid), bug_map.get(pid, 0))
    return out
