"""configuracion_negocio: TRM, costo del servidor y comision editables

Revision ID: f1a8d3b6c725
Revises: e5b7c1a94d20
Create Date: 2026-10-16 10:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1a8d3b6c725"
down_revision: Union[str, None] = "e5b7c1a94d20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "configuracion_negocio",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("costo_servidor_usd", sa.Numeric(10, 2), nullable=False),
        sa.Column("trm_usd_cop", sa.Numeric(10, 2), nullable=False),
        sa.Column("comision_paquetes_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("actualizado", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("configuracion_negocio")
