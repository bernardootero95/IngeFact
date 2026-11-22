from datetime import date, datetime

from pydantic import BaseModel

# Producto con el que la empresa facturadora vende los paquetes (se crea o
# actualiza solo en su catalogo, ver FacturacionPlanService).
CODIGO_PRODUCTO_PAQUETE = "PAQ-INGEFACT"
UNIDAD_MEDIDA_UNIDAD = "94"
FORMA_PAGO_CONTADO = "1"
METODO_PAGO_TRANSFERENCIA = "47"  # Transferencia Debito Bancaria

ESTADO_EMITIDA = "emitida"
ESTADO_EN_PROCESO = "en_proceso"
ESTADO_ERROR = "error"
ESTADO_ANULADA = "anulada"
ESTADO_SIN_FACTURA = "sin_factura"


def descripcion_paquete(max_documentos: int, fecha_inicio: date, fecha_fin: date) -> str:
    cantidad = f"{max_documentos:,}".replace(",", ".")
    return (
        f"Paquete de {cantidad} documentos electrónicos IngeFact. "
        f"Vigencia: {fecha_inicio:%d/%m/%Y} a {fecha_fin:%d/%m/%Y}."
    )


def estado_factura_venta(factura_estado: str | None, factura_error: str | None) -> str:
    """Estado que ve el admin para la factura de una venta."""
    if factura_estado == "aceptada":
        return ESTADO_EMITIDA
    if factura_estado == "enviada":
        return ESTADO_EN_PROCESO
    if factura_estado == "anulada":
        return ESTADO_ANULADA
    if factura_error or factura_estado == "rechazada":
        return ESTADO_ERROR
    return ESTADO_SIN_FACTURA


class FacturaVentaResponse(BaseModel):
    estado: str
    factura_id: str | None = None
    numero: str | None = None
    error: str | None = None


class VentaPaqueteResponse(BaseModel):
    id: str
    max_documentos: int
    precio: float
    fecha_inicio: date
    fecha_fin: date
    creado: datetime
    factura: FacturaVentaResponse

    @staticmethod
    def from_model(venta, factura) -> "VentaPaqueteResponse":
        error = venta.factura_error
        if factura is not None and factura.estado == "rechazada" and not error:
            error = factura.razon_rechazo or "La DIAN rechazó la factura."
        return VentaPaqueteResponse(
            id=str(venta.id),
            max_documentos=venta.max_documentos,
            precio=float(venta.precio),
            fecha_inicio=venta.fecha_inicio,
            fecha_fin=venta.fecha_fin,
            creado=venta.creado,
            factura=FacturaVentaResponse(
                estado=estado_factura_venta(factura.estado if factura else None, venta.factura_error),
                factura_id=str(factura.id) if factura else None,
                numero=factura.numero_completo if factura else None,
                error=error,
            ),
        )
