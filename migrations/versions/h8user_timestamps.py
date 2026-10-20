"""signup/last-login timestamps and a DB-controlled admin flag on users

Revision ID: h8usertime01
Revises: g7resume01
Create Date: 2026-10-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h8usertime01"
down_revision: Union[str, None] = "g7resume01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("created_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(), nullable=True))
    # Admin access is granted only here, in the database, never from the app:
    #   UPDATE users SET is_admin = true WHERE lower(email) = 'you@example.com';
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE users SET is_admin = true WHERE lower(email) = 'vikashmaddi@gmail.com'")
    # Existing accounts never recorded a signup time. The best proxy is the first goal they made;
    # anyone without a goal gets the migration time so they still show up in the totals.
    op.execute(
        """
        UPDATE users SET created_at = (
            SELECT MIN(created_at) FROM goals WHERE goals.owner_id = users.id
        ) WHERE created_at IS NULL
        """
    )
    op.execute("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")


def downgrade() -> None:
    op.drop_column("users", "is_admin")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "created_at")
