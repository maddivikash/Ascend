"""resume on the user + per-user "seen features" for in-app announcements

Revision ID: g7resume01
Revises: f6postkind01
Create Date: 2026-09-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g7resume01"
down_revision: Union[str, None] = "f6postkind01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("resume_text", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("resume_filename", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("resume_updated_at", sa.DateTime(), nullable=True))
    # Comma-separated feature keys the user has dismissed (e.g. "resume_upload").
    op.add_column("users", sa.Column("seen_features", sa.Text(), nullable=False,
                                     server_default=""))


def downgrade() -> None:
    op.drop_column("users", "seen_features")
    op.drop_column("users", "resume_updated_at")
    op.drop_column("users", "resume_filename")
    op.drop_column("users", "resume_text")
