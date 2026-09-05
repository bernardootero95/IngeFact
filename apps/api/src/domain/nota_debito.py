import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class LineaNotaDebitoRequest(BaseModel):
    factura_linea_id: uuid.UUID
    cantidad: float

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0.")
        return v


class CrearNotaDebitoRequest(BaseModel):
    motivo_codigo: str
    lineas: list[LineaNotaDebitoRequest]

    @field_validator("motivo_codigo")
    @classmethod
    def motivo_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El motivo es obligatorio.")
        return v

    @field_validator("lineas")
    @classmethod
    def al_menos_una_linea(cls, v: list[LineaNotaDebitoRequest]) -> list[LineaNotaDebitoRequest]:
        if not v:
            raise ValueError("La nota debito debe tener al menos una linea.")
        return v


class ActualizarNotaDebitoRequest(CrearNotaDebitoRequest):
    pass


class NotaDebitoLineaResponse(BaseModel):
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
    def from_model(linea) -> "NotaDebitoLineaResponse":
        return NotaDebitoLineaResponse(
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


class NotaDebitoResponse(BaseModel):
    id: str
    factura_id: str
    factura_numero_completo: str | None
    factura_cufe: str | None
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
    lineas: list[NotaDebitoLineaResponse]

    @staticmethod
    def from_model(nota: "NotaDebito") -> "NotaDebitoResponse":  # noqa: F821
        return NotaDebitoResponse(
            id=str(nota.id),
            factura_id=str(nota.factura_id),
            factura_numero_completo=nota.factura.numero_completo,
            factura_cufe=nota.factura.cufe,
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
            lineas=[NotaDebitoLineaResponse.from_model(linea) for linea in nota.lineas],
        )


class NotaDebitoListItemResponse(BaseModel):
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
    def from_model(nota: "NotaDebito") -> "NotaDebitoListItemResponse":  # noqa: F821
        return NotaDebitoListItemResponse(
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
