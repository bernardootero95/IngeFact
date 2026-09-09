"""usuarios_empresas debe_cambiar_password

Revision ID: 51bf4c0962f0
Revises: 72ca3ed743be
Create Date: 2026-09-08 22:10:48.664397

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51bf4c0962f0'
down_revision: Union[str, None] = '72ca3ed743be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default solo para poblar filas existentes (ej. usuarios ya
    # sembrados a mano) -- el modelo ya no lo necesita para inserts nuevos,
    # se quita despues de crear la columna.
    op.add_column(
        'usuarios_empresas',
        sa.Column('debe_cambiar_password', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column('usuarios_empresas', 'debe_cambiar_password', server_default=None)


def downgrade() -> None:
    op.drop_column('usuarios_empresas', 'debe_cambiar_password')
