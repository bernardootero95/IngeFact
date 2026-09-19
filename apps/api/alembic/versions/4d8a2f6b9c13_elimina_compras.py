"""elimina compras: tablas compras/compra_lineas y documentos_soporte.compra_id

El modulo de Compras se creo para alimentar el inventario. Al volver
IngeFact a ser solo un sistema de transmision de documentos electronicos, se
elimina junto con lo que se apoyaba en el: cargar Compra desde CUFE y
generar Documento Soporte desde una Compra. Se hace con una migracion nueva
(y no editando f532576ecb2e / 221b2074d216 / c2995368d397) porque esas ya se
aplicaron en produccion.

`proveedores` se conserva: el Documento Soporte lo necesita como vendedor.

DESTRUCTIVA: al aplicarla se pierden todas las compras y sus lineas, y el
vinculo documentos_soporte.compra_id. El downgrade recrea las estructuras
pero NO recupera los datos.

Revision ID: 4d8a2f6b9c13
Revises: 9b3e7c1d5a42
Create Date: 2026-09-19 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d8a2f6b9c13'
down_revision: Union[str, None] = '9b3e7c1d5a42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Al dropear la columna, Postgres elimina tambien su FK hacia compras.
    op.drop_column('documentos_soporte', 'compra_id')
    op.drop_table('compra_lineas')
    op.drop_index('ix_compras_empresa_cufe_activo', table_name='compras', postgresql_where=sa.text('eliminado IS NULL'))
    op.drop_table('compras')


def downgrade() -> None:
    op.create_table('compras',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('empresa_id', sa.UUID(), nullable=False),
    sa.Column('proveedor_id', sa.UUID(), nullable=False),
    sa.Column('fecha', sa.Date(), nullable=False),
    sa.Column('numero_documento_proveedor', sa.String(length=50), nullable=True),
    sa.Column('estado', sa.String(length=20), nullable=False),
    sa.Column('subtotal', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('total_impuestos', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('total', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('observaciones', sa.Text(), nullable=True),
    sa.Column('creado', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('actualizado', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('eliminado', sa.DateTime(timezone=True), nullable=True),
    sa.Column('cufe', sa.String(length=200), nullable=True),
    sa.CheckConstraint("estado IN ('registrada', 'anulada')", name='ck_compras_estado'),
    sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['proveedor_id'], ['proveedores.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_compras_empresa_cufe_activo', 'compras', ['empresa_id', 'cufe'], unique=True, postgresql_where=sa.text('eliminado IS NULL'))
    op.create_table('compra_lineas',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('compra_id', sa.UUID(), nullable=False),
    sa.Column('producto_id', sa.UUID(), nullable=False),
    sa.Column('codigo', sa.String(length=50), nullable=True),
    sa.Column('descripcion', sa.String(length=255), nullable=False),
    sa.Column('unidad_medida', sa.String(length=50), nullable=False),
    sa.Column('cantidad', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('precio_unitario', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('tributo', sa.String(length=50), nullable=True),
    sa.Column('tarifa_impuesto', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('subtotal_linea', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('impuesto_linea', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('total_linea', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('creado', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('cantidad > 0', name='ck_compra_lineas_cantidad_positiva'),
    sa.CheckConstraint('precio_unitario >= 0', name='ck_compra_lineas_precio_no_negativo'),
    sa.ForeignKeyConstraint(['compra_id'], ['compras.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('documentos_soporte', sa.Column('compra_id', sa.UUID(), nullable=True))
    op.create_foreign_key('documentos_soporte_compra_id_fkey', 'documentos_soporte', 'compras', ['compra_id'], ['id'])
