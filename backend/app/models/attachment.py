from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Attachment(Base):
    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint(
            "(execution_id IS NOT NULL AND defect_id IS NULL) OR (execution_id IS NULL AND defect_id IS NOT NULL)",
            name="ck_attachment_single_parent",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    execution_id: Mapped[int | None] = mapped_column(ForeignKey("executions.id", ondelete="CASCADE"), nullable=True, index=True)
    defect_id: Mapped[int | None] = mapped_column(ForeignKey("defects.id", ondelete="CASCADE"), nullable=True, index=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="attachments")
    execution = relationship("Execution", back_populates="attachments")
    defect = relationship("Defect", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by])
