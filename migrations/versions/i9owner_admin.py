"""grant the admin flag to the owner's actual Ascend accounts

Revision ID: i9owneradmin01
Revises: h8usertime01
Create Date: 2026-10-21
"""
from typing import Sequence, Union

from alembic import op

revision: str = "i9owneradmin01"
down_revision: Union[str, None] = "h8usertime01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OWNER_EMAILS = ("vickyvikashmaddi@gmail.com", "vikashmaddi1@gmail.com", "vikashmaddi@gmail.com")


def upgrade() -> None:
    emails = ", ".join(f"'{e}'" for e in OWNER_EMAILS)
    op.execute(f"UPDATE users SET is_admin = true WHERE lower(email) IN ({emails})")


def downgrade() -> None:
    emails = ", ".join(f"'{e}'" for e in OWNER_EMAILS)
    op.execute(f"UPDATE users SET is_admin = false WHERE lower(email) IN ({emails})")
