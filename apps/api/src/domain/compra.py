import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class LineaCompraRequest(BaseModel):
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


class CrearCompraRequest(BaseModel):
    proveedor_id: uuid.UUID
    fecha: date
    numero_documento_proveedor: str | None = None
    cufe: str | None = None
    observaciones: str | None = None
    lineas: list[LineaCompraRequest]

    @field_validator("lineas")
    @classmethod
    def al_menos_una_linea(cls, v: list[LineaCompraRequest]) -> list[LineaCompraRequest]:
        if not v:
            raise ValueError("La compra debe tener al menos una linea.")
        return v

    @field_validator("numero_documento_proveedor", "observaciones", "cufe")
    @classmethod
    def normalizar_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class ConsultarCufeMontoReferencia(BaseModel):
    subtotal: float | None
    impuestos: float | None
    total: float | None


class ConsultarCufeProveedorSugerido(BaseModel):
    nombre: str | None
    tipo_identificacion: str | None
    numero_identificacion: str | None
    proveedor_id_existente: str | None = None


class ConsultarCufeLineaSugerida(BaseModel):
    descripcion: str
    cantidad: float
    unidad_medida: str | None
    precio_unitario: float
    tributo: str | None
    tarifa_impuesto: float


class ConsultarCufeResponse(BaseModel):
    """Vista previa para prellenar el formulario de Compra a partir de un
    CUFE (Fase 5) -- no persiste nada. `lineas`/`proveedor_sugerido` vienen
    en None si Alegra no tiene custodia del XML de ese documento (caso
    normal para un proveedor externo real, ver docs/alegra-investigacion.md)."""

    fecha: date | None
    numero_documento_proveedor: str | None
    monto_referencia: ConsultarCufeMontoReferencia
    proveedor_sugerido: ConsultarCufeProveedorSugerido | None
    lineas: list[ConsultarCufeLineaSugerida] | None


class ActualizarCompraRequest(CrearCompraRequest):
    pass


class CompraLineaResponse(BaseModel):
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
    def from_model(linea) -> "CompraLineaResponse":
        return CompraLineaResponse(
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


class CompraResponse(BaseModel):
    id: str
    proveedor_id: str
    proveedor_nombre: str
    fecha: date
    numero_documento_proveedor: str | None
    cufe: str | None
    estado: str
    subtotal: float
    total_impuestos: float
    total: float
    observaciones: str | None
    documento_soporte_id: str | None
    creado: datetime
    lineas: list[CompraLineaResponse]

    @staticmethod
    def from_model(compra, documento_soporte_id: uuid.UUID | None = None) -> "CompraResponse":
        return CompraResponse(
            id=str(compra.id),
            proveedor_id=str(compra.proveedor_id),
            proveedor_nombre=compra.proveedor.nombre,
            fecha=compra.fecha,
            numero_documento_proveedor=compra.numero_documento_proveedor,
            cufe=compra.cufe,
            estado=compra.estado,
            subtotal=float(compra.subtotal),
            total_impuestos=float(compra.total_impuestos),
            total=float(compra.total),
            observaciones=compra.observaciones,
            documento_soporte_id=str(documento_soporte_id) if documento_soporte_id else None,
            creado=compra.creado,
            lineas=[CompraLineaResponse.from_model(linea) for linea in compra.lineas],
        )


class CompraListItemResponse(BaseModel):
    """Version liviana para el listado -- sin lineas, mismo patron que
    FacturaListItemResponse."""

    id: str
    proveedor_nombre: str
    fecha: date
    numero_documento_proveedor: str | None
    estado: str
    total: float

    @staticmethod
    def from_model(compra) -> "CompraListItemResponse":
        return CompraListItemResponse(
            id=str(compra.id),
            proveedor_nombre=compra.proveedor.nombre,
            fecha=compra.fecha,
            numero_documento_proveedor=compra.numero_documento_proveedor,
            estado=compra.estado,
            total=float(compra.total),
        )
