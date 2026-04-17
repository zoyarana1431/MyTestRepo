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
from app.schemas.rtm import RTMModuleRow, RTMProjectSummary, RTMRequirementRow


@dataclass
class RTMFilters:
    module_id: int | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    execution_cycle_id: int | None = None
    requirement_status: str | None = None


CLOSED_DEFECT = frozenset({"closed", "resolved", "duplicate"})


def _exec_query(
    db: Session,
    project_id: int,
    test_case_ids: list[int],
    f: RTMFilters,
) -> list[Execution]:
    if not test_case_ids:
        return []
    q = select(Execution).where(Execution.project_id == project_id, Execution.test_case_id.in_(test_case_ids))
    if f.date_from:
        q = q.where(Execution.executed_at >= f.date_from)
    if f.date_to:
        q = q.where(Execution.executed_at <= f.date_to)
    if f.execution_cycle_id is not None:
        q = q.where(Execution.execution_cycle_id == f.execution_cycle_id)
    return list(db.execute(q).scalars().all())


def _count_defects_for_requirement(db: Session, project_id: int, requirement_id: int) -> tuple[int, int]:
    rows = db.execute(
        select(Defect).where(
            Defect.project_id == project_id,
            Defect.requirement_id == requirement_id,
            Defect.deleted_at.is_(None),
        )
    ).scalars().all()
    open_n = sum(1 for d in rows if d.status not in CLOSED_DEFECT)
    closed_n = sum(1 for d in rows if d.status in CLOSED_DEFECT)
    return open_n, closed_n


def rtm_by_requirement(db: Session, project_id: int, f: RTMFilters) -> list[RTMRequirementRow]:
    reqs = db.execute(
        select(Requirement).where(Requirement.project_id == project_id, Requirement.deleted_at.is_(None))
    ).scalars().all()
    mod_map: dict[int, str] = {}
    for m in db.execute(select(Module).where(Module.project_id == project_id)).scalars().all():
        mod_map[m.id] = m.name

    out: list[RTMRequirementRow] = []
    for r in reqs:
        if f.module_id is not None and r.module_id != f.module_id:
            continue
        if f.requirement_status is not None and r.status != f.requirement_status:
            continue
        tc_ids = list(
            db.execute(
                select(requirement_test_cases.c.test_case_id).where(requirement_test_cases.c.requirement_id == r.id)
            ).scalars().all()
        )
        linked_tc = len(tc_ids)
        exes = _exec_query(db, project_id, tc_ids, f)
        exec_count = len(exes)
        pass_count = sum(1 for e in exes if e.status == "pass")
        fail_count = sum(1 for e in exes if e.status == "fail")
        blocked_count = sum(1 for e in exes if e.status == "blocked")
        not_run_count = sum(1 for e in exes if e.status == "not_run")
        retest_count = sum(1 for e in exes if e.status == "retest")
        open_d, closed_d = _count_defects_for_requirement(db, project_id, r.id)

        coverage = 100.0 if linked_tc and pass_count > 0 else 0.0

        latest = None
        if exes:
            last = max(exes, key=lambda e: e.executed_at)
            latest = last.status

        out.append(
            RTMRequirementRow(
                requirement_id=r.id,
                code=r.code,
                title=r.title,
                priority=r.priority,
                requirement_status=r.status,
                module_id=r.module_id,
                module_name=mod_map.get(r.module_id) if r.module_id else None,
                linked_test_case_count=linked_tc,
                execution_count=exec_count,
                pass_count=pass_count,
                fail_count=fail_count,
                blocked_count=blocked_count,
                not_run_count=not_run_count,
                retest_count=retest_count,
                open_defects=open_d,
                closed_defects=closed_d,
                coverage_pct=round(coverage, 1),
                latest_status=latest,
            )
        )
    return sorted(out, key=lambda x: x.code)


def rtm_by_module(db: Session, project_id: int, f: RTMFilters) -> list[RTMModuleRow]:
    reqs = db.execute(
        select(Requirement).where(Requirement.project_id == project_id, Requirement.deleted_at.is_(None))
    ).scalars().all()
    modules = {m.id: m.name for m in db.execute(select(Module).where(Module.project_id == project_id)).scalars().all()}
    modules[None] = "Unassigned"

    agg: dict[int | None, dict[str, int]] = {}
    for r in reqs:
        if f.module_id is not None and r.module_id != f.module_id:
            continue
        if f.requirement_status is not None and r.status != f.requirement_status:
            continue
        mid = r.module_id
        if mid not in agg:
            agg[mid] = {"req": 0, "tc": 0, "ex": 0, "pass": 0, "fail": 0}
        agg[mid]["req"] += 1
        tc_ids = list(
            db.execute(
                select(requirement_test_cases.c.test_case_id).where(requirement_test_cases.c.requirement_id == r.id)
            ).scalars().all()
        )
        agg[mid]["tc"] += len(tc_ids)
        exes = _exec_query(db, project_id, tc_ids, f)
        agg[mid]["ex"] += len(exes)
        agg[mid]["pass"] += sum(1 for e in exes if e.status == "pass")
        agg[mid]["fail"] += sum(1 for e in exes if e.status == "fail")

    rows: list[RTMModuleRow] = []
    for mid, v in sorted(agg.items(), key=lambda x: (x[0] is None, x[0] or 0)):
        rows.append(
            RTMModuleRow(
                module_id=mid,
                module_name=modules.get(mid) if mid is not None else "Unassigned",
                requirement_count=v["req"],
                linked_test_case_count=v["tc"],
                execution_count=v["ex"],
                pass_count=v["pass"],
                fail_count=v["fail"],
            )
        )
    return rows


def rtm_project_summary(db: Session, project_id: int, f: RTMFilters) -> RTMProjectSummary:
    tc_total = db.execute(
        select(func.count()).select_from(TestCase).where(TestCase.project_id == project_id, TestCase.deleted_at.is_(None))
    ).scalar_one()

    if f.module_id is not None:
        count_ex = (
            select(func.count())
            .select_from(Execution.__table__.join(TestCase.__table__, Execution.test_case_id == TestCase.id))
            .where(Execution.project_id == project_id, TestCase.module_id == f.module_id)
        )
    else:
        count_ex = select(func.count()).select_from(Execution).where(Execution.project_id == project_id)
    if f.date_from:
        count_ex = count_ex.where(Execution.executed_at >= f.date_from)
    if f.date_to:
        count_ex = count_ex.where(Execution.executed_at <= f.date_to)
    if f.execution_cycle_id is not None:
        count_ex = count_ex.where(Execution.execution_cycle_id == f.execution_cycle_id)

    ex_total = int(db.execute(count_ex).scalar_one() or 0)

    defects = db.execute(select(Defect).where(Defect.project_id == project_id, Defect.deleted_at.is_(None))).scalars().all()
    open_n = sum(1 for d in defects if d.status not in CLOSED_DEFECT)
    closed_n = sum(1 for d in defects if d.status in CLOSED_DEFECT)

    detail_rows = rtm_by_requirement(db, project_id, f)
    n = len(detail_rows)
    covered = sum(
        1 for x in detail_rows if x.linked_test_case_count > 0 and x.pass_count > 0
    )
    cov = 100.0 * covered / n if n else 0.0

    not_covered = sum(1 for x in detail_rows if x.linked_test_case_count == 0)
    req_tc_cov = 100.0 * (n - not_covered) / n if n else 0.0
    passing_req = sum(
        1
        for x in detail_rows
        if x.linked_test_case_count > 0 and x.fail_count == 0 and x.pass_count > 0
    )
    failing_req = sum(1 for x in detail_rows if x.fail_count > 0 or (x.latest_status == "fail"))

    return RTMProjectSummary(
        project_id=project_id,
        requirement_total=n,
        test_case_total=int(tc_total or 0),
        execution_total=int(ex_total or 0),
        defect_open=open_n,
        defect_closed=closed_n,
        coverage_pct=round(cov, 1),
        requirement_tc_coverage_pct=round(req_tc_cov, 1),
        passing_requirements=passing_req,
        failing_requirements=failing_req,
        not_covered_requirements=not_covered,
    )
