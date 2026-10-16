"""ventas_paquetes: historial de paquetes vendidos con su precio

Revision ID: e5b7c1a94d20
Revises: d8a3f2c6e914
Create Date: 2026-10-15 12:00:00

Backfill: las suscripciones creadas o iniciadas en el mes en curso (hora de
Colombia) quedan como una venta cada una, con el precio de la formula de la
calculadora (src/core/precio_paquete.py), para que el dashboard del admin
no arranque el mes en cero. Lo anterior a este mes no se reconstruye.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from src.core.precio_paquete import precio_paquete

revision: str = "e5b7c1a94d20"
down_revision: Union[str, None] = "d8a3f2c6e914"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tabla = op.create_table(
        "ventas_paquetes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "empresa_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("empresas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("max_documentos", sa.Integer(), nullable=False),
        sa.Column("precio", sa.Numeric(14, 2), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column("creado", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ventas_paquetes_empresa_id", "ventas_paquetes", ["empresa_id"])
    op.create_index("ix_ventas_paquetes_creado", "ventas_paquetes", ["creado"])

    filas = op.get_bind().execute(
        sa.text(
            """
            SELECT gen_random_uuid() AS id, empresa_id, max_documentos, fecha_inicio, fecha_fin,
                   LEAST(GREATEST(creado, fecha_inicio::timestamp AT TIME ZONE 'America/Bogota'), now()) AS creado
            FROM suscripciones
            WHERE estado = 'activa'
              AND (creado >= date_trunc('month', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'
                   OR fecha_inicio >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')::date)
            """
        )
    ).mappings().all()
    if filas:
        op.bulk_insert(
            tabla,
            [
                {
                    "id": f["id"],
                    "empresa_id": f["empresa_id"],
                    "max_documentos": f["max_documentos"],
                    "precio": precio_paquete(f["max_documentos"]),
                    "fecha_inicio": f["fecha_inicio"],
                    "fecha_fin": f["fecha_fin"],
                    "creado": f["creado"],
                }
                for f in filas
            ],
        )


def downgrade() -> None:
    op.drop_index("ix_ventas_paquetes_creado", table_name="ventas_paquetes")
    op.drop_index("ix_ventas_paquetes_empresa_id", table_name="ventas_paquetes")
    op.drop_table("ventas_paquetes")
