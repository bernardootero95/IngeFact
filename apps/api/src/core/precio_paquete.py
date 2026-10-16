"""Precio de un paquete de documentos y costos de Alegra.

Port de apps/admin/src/modules/pricing/pricingCalculator.js (DEFAULT_PARAMS y
DEFAULT_COSTOS): si cambias la formula o las tarifas alla, cambialas aqui.
Se usa para sugerir el precio de una venta cuando el admin no lo escribe y
para calcular el costo mensual de Alegra en el dashboard."""

import math

PRECIO_MINIMO = 20000
MICRO_TOPE = 50
MICRO_ANCLA = 92000
BASE = 20000
MARGEN_PCT = 30
TRAMOS_PRECIO = ((0, 150), (500, 100), (1500, 60), (5000, 40))

ALEGRA_MENSUALIDAD = 120000
# Documentos que ya incluye la mensualidad de Alegra.
ALEGRA_DOCUMENTOS_INCLUIDOS = 1000
TRAMOS_COSTO_ALEGRA = ((0, 14), (200000, 10), (500000, 6), (1000000, 4))


def _redondear_mil(n: float) -> int:
    # math.floor(x + 0.5) = Math.round de JS (round() de Python es bancario).
    return math.floor(n / 1000 + 0.5) * 1000


def _suma_por_tramos(cantidad: float, tramos, desde_documento: int = 0) -> float:
    """Cada documento paga la tarifa del tramo donde cae; solo cuentan los
    documentos posteriores a `desde_documento`."""
    total = 0.0
    for i, (inicio, tarifa) in enumerate(tramos):
        fin = tramos[i + 1][0] if i + 1 < len(tramos) else math.inf
        en_tramo = min(cantidad, fin) - max(inicio, desde_documento)
        if en_tramo > 0:
            total += en_tramo * tarifa
    return total


def precio_paquete(documentos: int) -> int:
    if documentos <= 0:
        return 0
    if documentos <= MICRO_TOPE:
        lineal = (MICRO_ANCLA / MICRO_TOPE) * documentos
        return _redondear_mil(max(lineal, PRECIO_MINIMO))
    return _redondear_mil((BASE + _suma_por_tramos(documentos, TRAMOS_PRECIO)) / (MARGEN_PCT / 100))


def costo_alegra_mes(documentos_mes: int) -> float:
    """Mensualidad + tarifa por cada documento por encima de los incluidos,
    segun el volumen total del mes (todos los clientes suman)."""
    excedente = _suma_por_tramos(documentos_mes, TRAMOS_COSTO_ALEGRA, ALEGRA_DOCUMENTOS_INCLUIDOS)
    return ALEGRA_MENSUALIDAD + excedente
