"""facturas_recibidas: datos leidos del XML DIAN por CUFE

Revision ID: b3e1a7c52d10
Revises: bdeb372c86c4
Create Date: 2026-09-28 20:00:00

Las facturas recibidas dejan de teclearse a mano: el proveedor, fechas, forma
de pago y total salen del XML que la DIAN tiene para el CUFE. El proveedor se
guarda copiado (nombre/NIT) y el enlace al directorio de Proveedores pasa a
ser opcional. Los registros existentes conservan su proveedor enlazado.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b3e1a7c52d10"
down_revision: Union[str, None] = "bdeb372c86c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("facturas_recibidas", sa.Column("proveedor_nombre", sa.String(length=255), nullable=True))
    op.add_column("facturas_recibidas", sa.Column("proveedor_nit", sa.String(length=50), nullable=True))
    op.add_column("facturas_recibidas", sa.Column("fecha_vencimiento", sa.Date(), nullable=True))
    op.add_column("facturas_recibidas", sa.Column("forma_pago", sa.String(length=2), nullable=True))
    op.execute(
        """
        UPDATE facturas_recibidas fr
        SET proveedor_nombre = p.nombre, proveedor_nit = p.numero_identificacion
        FROM proveedores p
        WHERE p.id = fr.proveedor_id
        """
    )
    op.alter_column("facturas_recibidas", "proveedor_nombre", nullable=False)
    op.alter_column("facturas_recibidas", "proveedor_id", existing_type=sa.UUID(), nullable=True)


def downgrade() -> None:
    op.alter_column("facturas_recibidas", "proveedor_id", existing_type=sa.UUID(), nullable=False)
    op.drop_column("facturas_recibidas", "forma_pago")
    op.drop_column("facturas_recibidas", "fecha_vencimiento")
    op.drop_column("facturas_recibidas", "proveedor_nit")
    op.drop_column("facturas_recibidas", "proveedor_nombre")
