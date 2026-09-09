"""suscripciones alerta_cuota_enviada

Revision ID: 468607b1011f
Revises: 51bf4c0962f0
Create Date: 2026-09-09 00:17:31.970755

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '468607b1011f'
down_revision: Union[str, None] = '51bf4c0962f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'suscripciones',
        sa.Column('alerta_cuota_enviada', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column('suscripciones', 'alerta_cuota_enviada', server_default=None)


def downgrade() -> None:
    op.drop_column('suscripciones', 'alerta_cuota_enviada')
