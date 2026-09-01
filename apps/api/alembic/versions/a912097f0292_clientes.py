"""clientes

Revision ID: a912097f0292
Revises: 4616657cdfc8
Create Date: 2026-08-31 17:58:15.212126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a912097f0292'
down_revision: Union[str, None] = '4616657cdfc8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('clientes',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('empresa_id', sa.UUID(), nullable=False),
    sa.Column('tipo_identificacion', sa.String(length=20), nullable=False),
    sa.Column('numero_identificacion', sa.String(length=50), nullable=False),
    sa.Column('nombre', sa.String(length=255), nullable=False),
    sa.Column('correo_electronico', sa.String(length=150), nullable=False),
    sa.Column('telefono', sa.String(length=50), nullable=True),
    sa.Column('tipo_organizacion', sa.String(length=50), nullable=True),
    sa.Column('regimen', sa.String(length=50), nullable=True),
    sa.Column('tributo', sa.String(length=50), nullable=True),
    sa.Column('estado', sa.String(length=20), nullable=False),
    sa.Column('creado', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('actualizado', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('eliminado', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    )
    # Documento unico por tenant solo entre clientes activos -- indice parcial
    # para que eliminar (soft-delete) un cliente libere su numero de
    # identificacion, mismo patron ya usado en "ix_suscripciones_empresa_activa".
    op.create_index(
        'ix_clientes_empresa_documento_activo',
        'clientes',
        ['empresa_id', 'numero_identificacion'],
        unique=True,
        postgresql_where=sa.text('eliminado IS NULL'),
    )


def downgrade() -> None:
    op.drop_index('ix_clientes_empresa_documento_activo', table_name='clientes')
    op.drop_table('clientes')
