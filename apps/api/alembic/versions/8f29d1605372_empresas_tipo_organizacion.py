"""empresas tipo_organizacion

Revision ID: 8f29d1605372
Revises: 2e2191b320bf
Create Date: 2026-08-30 22:27:15.198806

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f29d1605372'
down_revision: Union[str, None] = '2e2191b320bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('empresas', sa.Column('tipo_organizacion', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('empresas', 'tipo_organizacion')
