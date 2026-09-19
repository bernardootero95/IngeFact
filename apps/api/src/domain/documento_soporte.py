import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class LineaDocumentoSoporteRequest(BaseModel):
    producto_id: uuid.UUID
    cantidad: float
    precio_unitario: float | None = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0.")
        return v

    @field_validator("precio_unitario")
    @classmethod
    def precio_positivo(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("El precio debe ser mayor a 0.")
        return v


class CrearDocumentoSoporteRequest(BaseModel):
    proveedor_id: uuid.UUID
    fecha: date
    lineas: list[LineaDocumentoSoporteRequest]

    @field_validator("lineas")
    @classmethod
    def al_menos_una_linea(cls, v: list[LineaDocumentoSoporteRequest]) -> list[LineaDocumentoSoporteRequest]:
        if not v:
            raise ValueError("El documento soporte debe tener al menos una linea.")
        return v


class ActualizarDocumentoSoporteRequest(CrearDocumentoSoporteRequest):
    pass


class EnviarDocumentoSoporteRequest(BaseModel):
    forma_pago: str
    metodo_pago: str

    @field_validator("forma_pago", "metodo_pago")
    @classmethod
    def no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El campo no puede estar vacio.")
        return v


class DocumentoSoporteLineaResponse(BaseModel):
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
    def from_model(linea) -> "DocumentoSoporteLineaResponse":
        return DocumentoSoporteLineaResponse(
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


class DocumentoSoporteResponse(BaseModel):
    id: str
    proveedor_id: str
    proveedor_nombre: str
    fecha: date
    consecutivo: int | None
    numero_completo: str | None
    estado: str
    subtotal: float
    total_impuestos: float
    total: float
    forma_pago: str | None
    metodo_pago: str | None
    cuds: str | None
    qr_code_content: str | None
    razon_rechazo: str | None
    notificaciones_dian: list | None
    fecha_envio: datetime | None
    fecha_respuesta: datetime | None
    creado: datetime
    lineas: list[DocumentoSoporteLineaResponse]

    @staticmethod
    def from_model(documento) -> "DocumentoSoporteResponse":
        return DocumentoSoporteResponse(
            id=str(documento.id),
            proveedor_id=str(documento.proveedor_id),
            proveedor_nombre=documento.proveedor.nombre,
            fecha=documento.fecha,
            consecutivo=documento.consecutivo,
            numero_completo=documento.numero_completo,
            estado=documento.estado,
            subtotal=float(documento.subtotal),
            total_impuestos=float(documento.total_impuestos),
            total=float(documento.total),
            forma_pago=documento.forma_pago,
            metodo_pago=documento.metodo_pago,
            cuds=documento.cuds,
            qr_code_content=documento.qr_code_content,
            razon_rechazo=documento.razon_rechazo,
            notificaciones_dian=documento.notificaciones_dian,
            fecha_envio=documento.fecha_envio,
            fecha_respuesta=documento.fecha_respuesta,
            creado=documento.creado,
            lineas=[DocumentoSoporteLineaResponse.from_model(linea) for linea in documento.lineas],
        )


class DocumentoSoporteListItemResponse(BaseModel):
    """Version liviana para el listado -- sin lineas."""

    id: str
    proveedor_nombre: str
    fecha: date
    numero_completo: str | None
    estado: str
    total: float
    cuds: str | None

    @staticmethod
    def from_model(documento) -> "DocumentoSoporteListItemResponse":
        return DocumentoSoporteListItemResponse(
            id=str(documento.id),
            proveedor_nombre=documento.proveedor.nombre,
            fecha=documento.fecha,
            numero_completo=documento.numero_completo,
            estado=documento.estado,
            total=float(documento.total),
            cuds=documento.cuds,
        )
