from datetime import date, timedelta

from pydantic import BaseModel

# Solo cuentan las facturas que la DIAN ya acepto: una "enviada" puede
# terminar rechazada y una "anulada" ya no vale.
ESTADO_FACTURA_EMITIDA = "aceptada"


class FacturacionMes(BaseModel):
    cantidad: int
    total: float


class TenantDashboardResponse(BaseModel):
    facturas_emitidas_mes: int
    clientes_registrados: int
    resolucion_configurada: bool
    # Mes calendario en hora de Colombia (por la fecha de la factura).
    facturacion_mes: FacturacionMes
    facturacion_mes_anterior: FacturacionMes
    productos_registrados: int
    # True si la empresa ya tiene al menos una factura aceptada, de cualquier mes.
    tiene_facturas: bool


def rango_mes(dia: date) -> tuple[date, date]:
    """Primer dia del mes de `dia` y primer dia del mes siguiente (exclusivo)."""
    inicio = dia.replace(day=1)
    siguiente = (inicio + timedelta(days=32)).replace(day=1)
    return inicio, siguiente


def rango_mes_anterior(dia: date) -> tuple[date, date]:
    inicio_actual, _ = rango_mes(dia)
    return rango_mes(inicio_actual - timedelta(days=1))
