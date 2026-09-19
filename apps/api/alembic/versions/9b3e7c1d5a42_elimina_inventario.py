"""elimina inventario: movimientos_inventario, stock_actual y toggles de empresa

IngeFact vuelve a ser solo un sistema de transmision de documentos
electronicos -- no maneja inventario. Se hace con una migracion nueva (y no
borrando eeac61931003) porque esa ya se aplico en produccion y otras
migraciones cuelgan de ella.

DESTRUCTIVA: al aplicarla se pierden `movimientos_inventario`,
`productos.stock_actual` y los toggles `empresas.inventario_habilitado` /
`empresas.permitir_facturar_sin_stock`. El downgrade recrea las estructuras
pero NO recupera los datos.

Revision ID: 9b3e7c1d5a42
Revises: 221b2074d216
Create Date: 2026-09-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b3e7c1d5a42'
down_revision: Union[str, None] = '221b2074d216'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('movimientos_inventario')
    op.drop_column('productos', 'stock_actual')
    op.drop_column('empresas', 'permitir_facturar_sin_stock')
    op.drop_column('empresas', 'inventario_habilitado')


def downgrade() -> None:
    op.add_column(
        'empresas',
        sa.Column('inventario_habilitado', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.add_column(
        'empresas',
        sa.Column('permitir_facturar_sin_stock', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.add_column('productos', sa.Column('stock_actual', sa.Numeric(precision=12, scale=2), nullable=True))
    op.create_table('movimientos_inventario',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('empresa_id', sa.UUID(), nullable=False),
    sa.Column('producto_id', sa.UUID(), nullable=False),
    sa.Column('tipo', sa.String(length=10), nullable=False),
    sa.Column('cantidad', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('origen_tipo', sa.String(length=20), nullable=False),
    sa.Column('origen_id', sa.UUID(), nullable=True),
    sa.Column('saldo_resultante', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('creado', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("origen_tipo IN ('compra', 'factura', 'ajuste_manual')", name='ck_movimientos_inventario_origen_tipo'),
    sa.CheckConstraint("tipo IN ('entrada', 'salida')", name='ck_movimientos_inventario_tipo'),
    sa.CheckConstraint('cantidad > 0', name='ck_movimientos_inventario_cantidad_positiva'),
    sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
