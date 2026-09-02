import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class LineaFacturaRequest(BaseModel):
    producto_id: uuid.UUID
    cantidad: float

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0.")
        return v


class CrearFacturaRequest(BaseModel):
    cliente_id: uuid.UUID
    fecha: date
    lineas: list[LineaFacturaRequest]

    @field_validator("lineas")
    @classmethod
    def al_menos_una_linea(cls, v: list[LineaFacturaRequest]) -> list[LineaFacturaRequest]:
        if not v:
            raise ValueError("La factura debe tener al menos una linea.")
        return v


class ActualizarFacturaRequest(CrearFacturaRequest):
    pass


class EnviarFacturaRequest(BaseModel):
    forma_pago: str
    metodo_pago: str

    @field_validator("forma_pago", "metodo_pago")
    @classmethod
    def no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El campo no puede estar vacio.")
        return v


class FacturaLineaResponse(BaseModel):
    id: str
    producto_id: str
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
    def from_model(linea) -> "FacturaLineaResponse":
        return FacturaLineaResponse(
            id=str(linea.id),
            producto_id=str(linea.producto_id),
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


class FacturaResponse(BaseModel):
    id: str
    cliente_id: str
    cliente_nombre: str
    fecha: date
    consecutivo: int | None
    numero_completo: str | None
    estado: str
    subtotal: float
    total_impuestos: float
    total: float
    forma_pago: str | None
    metodo_pago: str | None
    cufe: str | None
    qr_code_content: str | None
    razon_rechazo: str | None
    notificaciones_dian: list | None
    fecha_envio: datetime | None
    fecha_respuesta: datetime | None
    creado: datetime
    lineas: list[FacturaLineaResponse]

    @staticmethod
    def from_model(factura) -> "FacturaResponse":
        return FacturaResponse(
            id=str(factura.id),
            cliente_id=str(factura.cliente_id),
            cliente_nombre=factura.cliente.nombre,
            fecha=factura.fecha,
            consecutivo=factura.consecutivo,
            numero_completo=factura.numero_completo,
            estado=factura.estado,
            subtotal=float(factura.subtotal),
            total_impuestos=float(factura.total_impuestos),
            total=float(factura.total),
            forma_pago=factura.forma_pago,
            metodo_pago=factura.metodo_pago,
            cufe=factura.cufe,
            qr_code_content=factura.qr_code_content,
            razon_rechazo=factura.razon_rechazo,
            notificaciones_dian=factura.notificaciones_dian,
            fecha_envio=factura.fecha_envio,
            fecha_respuesta=factura.fecha_respuesta,
            creado=factura.creado,
            lineas=[FacturaLineaResponse.from_model(linea) for linea in factura.lineas],
        )


class FacturaListItemResponse(BaseModel):
    """Version liviana para el listado -- sin lineas."""

    id: str
    cliente_nombre: str
    fecha: date
    numero_completo: str | None
    estado: str
    total: float
    cufe: str | None

    @staticmethod
    def from_model(factura) -> "FacturaListItemResponse":
        return FacturaListItemResponse(
            id=str(factura.id),
            cliente_nombre=factura.cliente.nombre,
            fecha=factura.fecha,
            numero_completo=factura.numero_completo,
            estado=factura.estado,
            total=float(factura.total),
            cufe=factura.cufe,
        )
