from sqlalchemy import Column, ForeignKey, Integer, Table

from app.db.base import Base

requirement_test_cases = Table(
    "requirement_test_cases",
    Base.metadata,
    Column("requirement_id", Integer, ForeignKey("requirements.id", ondelete="CASCADE"), primary_key=True),
    Column("test_case_id", Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), primary_key=True),
)
