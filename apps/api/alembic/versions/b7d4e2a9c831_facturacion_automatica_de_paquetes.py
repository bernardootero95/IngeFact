"""Factura electronica automatica de los paquetes vendidos

Revision ID: b7d4e2a9c831
Revises: a3c9e2f71b40
Create Date: 2026-11-22 10:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b7d4e2a9c831"
down_revision: Union[str, None] = "a3c9e2f71b40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ventas_paquetes", sa.Column("factura_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("ventas_paquetes", sa.Column("factura_error", sa.Text(), nullable=True))
    op.create_foreign_key(
        "fk_ventas_paquetes_factura_id", "ventas_paquetes", "facturas", ["factura_id"], ["id"], ondelete="SET NULL"
    )
    op.add_column(
        "configuracion_negocio",
        sa.Column("empresa_facturadora_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_configuracion_negocio_empresa_facturadora",
        "configuracion_negocio",
        "empresas",
        ["empresa_facturadora_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_configuracion_negocio_empresa_facturadora", "configuracion_negocio", type_="foreignkey")
    op.drop_column("configuracion_negocio", "empresa_facturadora_id")
    op.drop_constraint("fk_ventas_paquetes_factura_id", "ventas_paquetes", type_="foreignkey")
    op.drop_column("ventas_paquetes", "factura_error")
    op.drop_column("ventas_paquetes", "factura_id")
