"""Lightweight, idempotent patches for dev SQLite DBs when Alembic was not run.

`Base.metadata.create_all()` does not add new columns to existing tables; older local
`qa_local.db` files may miss columns added in later migrations.
"""

from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def apply_engine_schema_patches(engine: Engine) -> None:
    """Ensure required columns exist (safe to call on every startup)."""
    try:
        inspector = inspect(engine)
    except Exception:
        return
    if "modules" not in inspector.get_table_names():
        return
    col_names = {c["name"] for c in inspector.get_columns("modules")}
    if "description" in col_names:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE modules ADD COLUMN description TEXT"))
