"""valor_impuesto_excluido: impuesto monofasico (ICL/IBUA) excluido de la base del IVA

`productos.valor_impuesto_excluido` es el valor fijo por unidad ya pagado al
productor y embebido en el precio; las lineas de factura y de notas
credito/debito guardan el valor TOTAL de la linea como snapshot. No se crean
tablas nuevas ni se modifican datos existentes (default 0 = comportamiento
anterior). Los CheckConstraint van a mano: Alembic no los autogenera.

Revision ID: a3f5c8e21b74
Revises: d7c14e9a3b58
Create Date: 2026-09-19 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f5c8e21b74'
down_revision: Union[str, None] = 'd7c14e9a3b58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLAS_LINEA = (
    ('factura_lineas', 'ck_factura_lineas_valor_impuesto_excluido_rango'),
    ('nota_credito_lineas', 'ck_nota_credito_lineas_valor_impuesto_excluido_rango'),
    ('nota_debito_lineas', 'ck_nota_debito_lineas_valor_impuesto_excluido_rango'),
)


def upgrade() -> None:
    op.add_column(
        'productos',
        sa.Column('valor_impuesto_excluido', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0'),
    )
    op.create_check_constraint(
        'ck_productos_valor_impuesto_excluido_no_negativo', 'productos', 'valor_impuesto_excluido >= 0'
    )

    for tabla, constraint in _TABLAS_LINEA:
        op.add_column(
            tabla,
            sa.Column('valor_impuesto_excluido', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0'),
        )
        op.create_check_constraint(
            constraint, tabla, 'valor_impuesto_excluido >= 0 AND valor_impuesto_excluido <= subtotal_linea'
        )


def downgrade() -> None:
    for tabla, constraint in reversed(_TABLAS_LINEA):
        op.drop_constraint(constraint, tabla, type_='check')
        op.drop_column(tabla, 'valor_impuesto_excluido')

    op.drop_constraint('ck_productos_valor_impuesto_excluido_no_negativo', 'productos', type_='check')
    op.drop_column('productos', 'valor_impuesto_excluido')
