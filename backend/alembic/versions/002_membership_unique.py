"""unique project membership per user

Revision ID: 002
Revises: 001
Create Date: 2026-04-14

"""

from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_project_membership_user_project", "project_memberships", ["user_id", "project_id"])


def downgrade() -> None:
    op.drop_constraint("uq_project_membership_user_project", "project_memberships", type_="unique")
