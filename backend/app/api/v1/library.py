from sqlalchemy import cast, func, or_, select, String
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser, get_db_session
from app.models.module import Module
from app.models.project import Project, ProjectMembership
from app.models.test_case import TestCase
from app.schemas.library import ReusableLibraryItem

router = APIRouter(prefix="/library", tags=["library"])


def _title(tc: TestCase) -> str:
    if tc.feature_name and tc.feature_name.strip():
        return tc.feature_name.strip()
    if tc.test_scenario and tc.test_scenario.strip():
        t = tc.test_scenario.strip()
        return t[:120] + ("…" if len(t) > 120 else "")
    return tc.code


def _category_line(tc: TestCase, module_name: str | None) -> str:
    left = module_name or "General"
    right = (tc.feature_name or "").strip() or (tc.test_scenario or "").strip()[:80]
    if right and right != left:
        if len(right) > 80:
            right = right[:80] + "…"
        return f"{left} — {right}"
    return left


@router.get("/reusable-test-cases", response_model=list[ReusableLibraryItem])
def list_reusable_test_cases(
    user: CurrentUser,
    db: Session = Depends(get_db_session),
    q: str | None = Query(None, description="Search code, title, description, preconditions, tags (text)"),
    test_type: str | None = Query(None, description="Filter by test_type; omit or 'all' for every type"),
) -> list[ReusableLibraryItem]:
    stmt = (
        select(TestCase, Project)
        .join(Project, Project.id == TestCase.project_id)
        .join(ProjectMembership, ProjectMembership.project_id == Project.id)
        .where(
            ProjectMembership.user_id == user.id,
            TestCase.is_reusable.is_(True),
            TestCase.deleted_at.is_(None),
        )
    )
    if test_type and test_type.strip().lower() not in ("", "all"):
        stmt = stmt.where(TestCase.test_type == test_type.strip().lower())
    if q and q.strip():
        like = f"%{q.strip()}%"
        tags_as_text = cast(TestCase.tags, String)
        stmt = stmt.where(
            or_(
                TestCase.code.ilike(like),
                func.coalesce(TestCase.feature_name, "").ilike(like),
                func.coalesce(TestCase.test_scenario, "").ilike(like),
                func.coalesce(TestCase.description, "").ilike(like),
                func.coalesce(TestCase.preconditions, "").ilike(like),
                func.coalesce(tags_as_text, "").ilike(like),
            )
        )

    rows = db.execute(stmt.order_by(TestCase.id.asc())).all()
    if not rows:
        return []

    module_ids = {tc.module_id for tc, _ in rows if tc.module_id is not None}
    mod_map: dict[int, str] = {}
    if module_ids:
        mods = db.execute(select(Module).where(Module.id.in_(module_ids))).scalars().all()
        mod_map = {m.id: m.name for m in mods}

    out: list[ReusableLibraryItem] = []
    for tc, proj in rows:
        mod_name = mod_map.get(tc.module_id) if tc.module_id else None
        out.append(
            ReusableLibraryItem(
                id=tc.id,
                library_code=f"LIB-{tc.id:03d}",
                project_id=proj.id,
                project_code=proj.code,
                project_name=proj.name,
                title=_title(tc),
                category_line=_category_line(tc, mod_name),
                description=tc.description,
                test_type=tc.test_type,
                priority=tc.priority,
                tags=tc.tags,
                preconditions=tc.preconditions,
            )
        )
    return out
