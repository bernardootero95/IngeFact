from dataclasses import dataclass


@dataclass(frozen=True)
class LineaCalculada:
    subtotal_linea: float
    valor_impuesto_excluido: float
    base_gravable_iva: float
    impuesto_linea: float
    total_linea: float


def base_gravable_iva(subtotal_linea: float, valor_impuesto_excluido: float) -> float:
    """Base del IVA de una linea: el valor de un impuesto monofasico (ICL/IBUA)
    ya pagado por el productor y embebido en el precio se excluye de la base,
    aunque el revendedor no lo factura como tributo propio."""
    return round(float(subtotal_linea) - float(valor_impuesto_excluido), 2)


def calcular_linea(
    cantidad: float, precio_unitario: float, tarifa: float, valor_impuesto_excluido: float = 0
) -> LineaCalculada:
    """`valor_impuesto_excluido` es el valor TOTAL de la linea (no por unidad).
    `subtotal_linea` sigue siendo cantidad * precio_unitario -- solo el IVA se
    calcula sobre la base reducida."""
    subtotal_linea = round(cantidad * precio_unitario, 2)
    if valor_impuesto_excluido < 0 or valor_impuesto_excluido > subtotal_linea:
        raise ValueError("El impuesto excluido de IVA no puede ser negativo ni mayor al subtotal de la linea.")

    base = base_gravable_iva(subtotal_linea, valor_impuesto_excluido)
    impuesto_linea = round(base * tarifa / 100, 2)
    return LineaCalculada(
        subtotal_linea=subtotal_linea,
        valor_impuesto_excluido=float(valor_impuesto_excluido),
        base_gravable_iva=base,
        impuesto_linea=impuesto_linea,
        total_linea=round(subtotal_linea + impuesto_linea, 2),
    )


def excluido_proporcional(
    valor_excluido_origen: float, cantidad_origen: float, cantidad: float, subtotal_linea: float
) -> float:
    """Parte del valor excluido de una linea de factura que corresponde a
    `cantidad` (para Notas Credito/Debito sobre esa linea). El tope al
    subtotal evita que el redondeo lo supere por centavos."""
    if cantidad_origen <= 0:
        return 0.0
    proporcional = round(float(valor_excluido_origen) * float(cantidad) / float(cantidad_origen), 2)
    return min(proporcional, float(subtotal_linea))
