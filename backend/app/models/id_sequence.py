from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IdSequence(Base):
    """Atomic counters for human-readable codes (e.g. PRJ-001)."""

    __tablename__ = "id_sequences"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
