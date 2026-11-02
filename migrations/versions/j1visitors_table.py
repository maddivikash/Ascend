"""track unique visitors per day

Revision ID: j1visitortable01
Revises: i9owneradmin01
Create Date: 2026-10-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "j1visitortable01"
down_revision: Union[str, None] = "i9owneradmin01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "visits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("ip_key", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("date", "ip_key", name="uq_visit_date_ip"),
    )
    op.create_index("ix_visits_date", "visits", ["date"], unique=False)
    op.create_index("ix_visits_ip_key", "visits", ["ip_key"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_visits_ip_key", table_name="visits")
    op.drop_index("ix_visits_date", table_name="visits")
    op.drop_table("visits")
