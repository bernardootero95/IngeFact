"""empresas: logo para las representaciones graficas

Revision ID: d8a3f2c6e914
Revises: c4d2a9e1f7b3
Create Date: 2026-10-02 18:00:00

Logo (PNG/JPEG, max 300 KB) guardado en la BD y la opcion de imprimirlo en
los documentos. Por defecto no se muestra.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d8a3f2c6e914"
down_revision: Union[str, None] = "c4d2a9e1f7b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("empresas", sa.Column("logo", sa.LargeBinary(), nullable=True))
    op.add_column("empresas", sa.Column("logo_mime", sa.String(length=20), nullable=True))
    op.add_column(
        "empresas", sa.Column("mostrar_logo", sa.Boolean(), nullable=False, server_default=sa.text("false"))
    )


def downgrade() -> None:
    op.drop_column("empresas", "mostrar_logo")
    op.drop_column("empresas", "logo_mime")
    op.drop_column("empresas", "logo")
