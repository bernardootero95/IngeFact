"""eventos_receptor.origen: eventos registrados desde IngeFact o leidos de la DIAN

Revision ID: a3c9e2f71b40
Revises: f1a8d3b6c725
Create Date: 2026-10-24 10:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a3c9e2f71b40"
down_revision: Union[str, None] = "f1a8d3b6c725"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "eventos_receptor",
        sa.Column("origen", sa.String(length=10), nullable=False, server_default="ingefact"),
    )
    op.create_check_constraint(
        "ck_eventos_receptor_origen", "eventos_receptor", "origen IN ('ingefact', 'dian')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_eventos_receptor_origen", "eventos_receptor", type_="check")
    op.drop_column("eventos_receptor", "origen")
