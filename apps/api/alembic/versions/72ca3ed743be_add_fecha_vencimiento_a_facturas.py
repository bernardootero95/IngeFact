"""add fecha_vencimiento a facturas

Revision ID: 72ca3ed743be
Revises: ff7b14743998
Create Date: 2026-09-06 15:58:10.445998

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72ca3ed743be'
down_revision: Union[str, None] = 'ff7b14743998'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("facturas", sa.Column("fecha_vencimiento", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("facturas", "fecha_vencimiento")
