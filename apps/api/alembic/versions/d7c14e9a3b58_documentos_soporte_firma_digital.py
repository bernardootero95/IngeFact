"""documentos_soporte: firma_digital (cache de la firma del XML para la representacion grafica)

Revision ID: d7c14e9a3b58
Revises: 4d8a2f6b9c13
Create Date: 2026-09-19 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7c14e9a3b58'
down_revision: Union[str, None] = '4d8a2f6b9c13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('documentos_soporte', sa.Column('firma_digital', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('documentos_soporte', 'firma_digital')
