"""facturas: notas libres del documento

Revision ID: c4d2a9e1f7b3
Revises: b3e1a7c52d10
Create Date: 2026-10-02 10:00:00

Texto libre que el usuario agrega a la factura (condiciones, referencias,
datos de pago). Se envia a Alegra en `note` (etiqueta <Note> de la DIAN) y se
muestra en la representacion grafica.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4d2a9e1f7b3"
down_revision: Union[str, None] = "b3e1a7c52d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("facturas", sa.Column("notas", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("facturas", "notas")
