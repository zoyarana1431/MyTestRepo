from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Execution(Base):
    """Immutable execution record (append-only; no updates in API)."""

    __tablename__ = "executions"
    __table_args__ = (UniqueConstraint("project_id", "code", name="uq_execution_project_code"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    test_case_id: Mapped[int] = mapped_column(ForeignKey("test_cases.id", ondelete="CASCADE"), index=True)
    requirement_id: Mapped[int | None] = mapped_column(ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True)
    execution_cycle_id: Mapped[int | None] = mapped_column(
        ForeignKey("execution_cycles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    build_version: Mapped[str | None] = mapped_column(String(128), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(255), nullable=True)
    environment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    executed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    actual_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    retest_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    retest_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    final_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="executions")
    test_case = relationship("TestCase", back_populates="executions")
    requirement = relationship("Requirement", back_populates="executions")
    execution_cycle = relationship("ExecutionCycle", back_populates="executions")
    executor = relationship("User", foreign_keys=[executed_by])
    attachments = relationship("Attachment", back_populates="execution")
    defects = relationship("Defect", back_populates="execution")
