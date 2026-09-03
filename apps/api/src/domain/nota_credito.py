import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class LineaNotaCreditoRequest(BaseModel):
    factura_linea_id: uuid.UUID
    cantidad: float

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0.")
        return v


class CrearNotaCreditoRequest(BaseModel):
    motivo_codigo: str
    lineas: list[LineaNotaCreditoRequest]

    @field_validator("motivo_codigo")
    @classmethod
    def motivo_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El motivo es obligatorio.")
        return v

    @field_validator("lineas")
    @classmethod
    def al_menos_una_linea(cls, v: list[LineaNotaCreditoRequest]) -> list[LineaNotaCreditoRequest]:
        if not v:
            raise ValueError("La nota credito debe tener al menos una linea.")
        return v


class ActualizarNotaCreditoRequest(CrearNotaCreditoRequest):
    pass


class NotaCreditoLineaResponse(BaseModel):
    id: str
    factura_linea_id: str
    codigo: str | None
    descripcion: str
    unidad_medida: str
    cantidad: float
    precio_unitario: float
    tributo: str | None
    tarifa_impuesto: float
    subtotal_linea: float
    impuesto_linea: float
    total_linea: float

    @staticmethod
    def from_model(linea) -> "NotaCreditoLineaResponse":
        return NotaCreditoLineaResponse(
            id=str(linea.id),
            factura_linea_id=str(linea.factura_linea_id),
            codigo=linea.codigo,
            descripcion=linea.descripcion,
            unidad_medida=linea.unidad_medida,
            cantidad=float(linea.cantidad),
            precio_unitario=float(linea.precio_unitario),
            tributo=linea.tributo,
            tarifa_impuesto=float(linea.tarifa_impuesto),
            subtotal_linea=float(linea.subtotal_linea),
            impuesto_linea=float(linea.impuesto_linea),
            total_linea=float(linea.total_linea),
        )


class NotaCreditoResponse(BaseModel):
    id: str
    factura_id: str
    factura_numero_completo: str | None
    cliente_id: str
    cliente_nombre: str
    fecha: date
    motivo_codigo: str
    consecutivo: int | None
    numero_completo: str | None
    estado: str
    subtotal: float
    total_impuestos: float
    total: float
    cude: str | None
    qr_code_content: str | None
    razon_rechazo: str | None
    notificaciones_dian: list | None
    fecha_envio: datetime | None
    fecha_respuesta: datetime | None
    creado: datetime
    lineas: list[NotaCreditoLineaResponse]

    @staticmethod
    def from_model(nota: "NotaCredito") -> "NotaCreditoResponse":  # noqa: F821
        return NotaCreditoResponse(
            id=str(nota.id),
            factura_id=str(nota.factura_id),
            factura_numero_completo=nota.factura.numero_completo,
            cliente_id=str(nota.cliente_id),
            cliente_nombre=nota.cliente.nombre,
            fecha=nota.fecha,
            motivo_codigo=nota.motivo_codigo,
            consecutivo=nota.consecutivo,
            numero_completo=nota.numero_completo,
            estado=nota.estado,
            subtotal=float(nota.subtotal),
            total_impuestos=float(nota.total_impuestos),
            total=float(nota.total),
            cude=nota.cude,
            qr_code_content=nota.qr_code_content,
            razon_rechazo=nota.razon_rechazo,
            notificaciones_dian=nota.notificaciones_dian,
            fecha_envio=nota.fecha_envio,
            fecha_respuesta=nota.fecha_respuesta,
            creado=nota.creado,
            lineas=[NotaCreditoLineaResponse.from_model(linea) for linea in nota.lineas],
        )


class NotaCreditoListItemResponse(BaseModel):
    """Version liviana para el listado -- sin lineas."""

    id: str
    factura_id: str
    factura_numero_completo: str | None
    cliente_nombre: str
    fecha: date
    motivo_codigo: str
    numero_completo: str | None
    estado: str
    total: float
    cude: str | None

    @staticmethod
    def from_model(nota: "NotaCredito") -> "NotaCreditoListItemResponse":  # noqa: F821
        return NotaCreditoListItemResponse(
            id=str(nota.id),
            factura_id=str(nota.factura_id),
            factura_numero_completo=nota.factura.numero_completo,
            cliente_nombre=nota.cliente.nombre,
            fecha=nota.fecha,
            motivo_codigo=nota.motivo_codigo,
            numero_completo=nota.numero_completo,
            estado=nota.estado,
            total=float(nota.total),
            cude=nota.cude,
        )


class DisponibilidadLineaResponse(BaseModel):
    """Cuanto de una linea de factura todavia se puede acreditar -- la
    cantidad original menos lo ya acreditado por notas credito ACEPTADAS
    (varias notas parciales pueden coexistir sobre la misma factura)."""

    factura_linea_id: str
    cantidad_disponible: float
