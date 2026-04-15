"""execution cycles, executions, defects, attachments

Revision ID: 004
Revises: 003
Create Date: 2026-04-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "execution_cycles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("build_version", sa.String(length=128), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "code", name="uq_cycle_project_code"),
    )
    op.create_index(op.f("ix_execution_cycles_project_id"), "execution_cycles", ["project_id"], unique=False)

    op.create_table(
        "executions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("test_case_id", sa.Integer(), nullable=False),
        sa.Column("requirement_id", sa.Integer(), nullable=True),
        sa.Column("execution_cycle_id", sa.Integer(), nullable=True),
        sa.Column("build_version", sa.String(length=128), nullable=True),
        sa.Column("platform", sa.String(length=255), nullable=True),
        sa.Column("environment", sa.String(length=255), nullable=True),
        sa.Column("executed_by", sa.Integer(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("actual_result", sa.Text(), nullable=True),
        sa.Column("retest_required", sa.Boolean(), nullable=False),
        sa.Column("retest_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("final_status", sa.String(length=32), nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["execution_cycle_id"], ["execution_cycles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["executed_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["test_case_id"], ["test_cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "code", name="uq_execution_project_code"),
    )
    op.create_index(op.f("ix_executions_project_id"), "executions", ["project_id"], unique=False)
    op.create_index(op.f("ix_executions_test_case_id"), "executions", ["test_case_id"], unique=False)
    op.create_index(op.f("ix_executions_execution_cycle_id"), "executions", ["execution_cycle_id"], unique=False)

    op.create_table(
        "defects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("steps_to_reproduce", sa.Text(), nullable=True),
        sa.Column("expected_result", sa.Text(), nullable=True),
        sa.Column("actual_result", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("priority", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("assigned_to", sa.Integer(), nullable=True),
        sa.Column("reported_by", sa.Integer(), nullable=True),
        sa.Column("module_id", sa.Integer(), nullable=True),
        sa.Column("requirement_id", sa.Integer(), nullable=True),
        sa.Column("test_case_id", sa.Integer(), nullable=True),
        sa.Column("execution_id", sa.Integer(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["execution_id"], ["executions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reported_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["test_case_id"], ["test_cases.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "code", name="uq_defect_project_code"),
    )
    op.create_index(op.f("ix_defects_project_id"), "defects", ["project_id"], unique=False)
    op.create_index(op.f("ix_defects_code"), "defects", ["code"], unique=False)

    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("execution_id", sa.Integer(), nullable=True),
        sa.Column("defect_id", sa.Integer(), nullable=True),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.CheckConstraint(
            "(execution_id IS NOT NULL AND defect_id IS NULL) OR (execution_id IS NULL AND defect_id IS NOT NULL)",
            name="ck_attachment_single_parent",
        ),
        sa.ForeignKeyConstraint(["defect_id"], ["defects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["execution_id"], ["executions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attachments_project_id"), "attachments", ["project_id"], unique=False)
    op.create_index(op.f("ix_attachments_execution_id"), "attachments", ["execution_id"], unique=False)
    op.create_index(op.f("ix_attachments_defect_id"), "attachments", ["defect_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_attachments_defect_id"), table_name="attachments")
    op.drop_index(op.f("ix_attachments_execution_id"), table_name="attachments")
    op.drop_index(op.f("ix_attachments_project_id"), table_name="attachments")
    op.drop_table("attachments")
    op.drop_index(op.f("ix_defects_code"), table_name="defects")
    op.drop_index(op.f("ix_defects_project_id"), table_name="defects")
    op.drop_table("defects")
    op.drop_index(op.f("ix_executions_execution_cycle_id"), table_name="executions")
    op.drop_index(op.f("ix_executions_test_case_id"), table_name="executions")
    op.drop_index(op.f("ix_executions_project_id"), table_name="executions")
    op.drop_table("executions")
    op.drop_index(op.f("ix_execution_cycles_project_id"), table_name="execution_cycles")
    op.drop_table("execution_cycles")
