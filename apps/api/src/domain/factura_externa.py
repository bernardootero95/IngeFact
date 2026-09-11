import uuid
from datetime import date

from pydantic import BaseModel, field_validator

TIPOS_VALIDOS = ("bien", "servicio")


class ItemFacturaExternaRequest(BaseModel):
    """Linea de factura para la API externa (/external/v1/facturas) -- a
    diferencia de LineaFacturaRequest (que referencia un producto_id ya
    existente), trae el item embebido, como lo recibe Alegra. El backend
    crea/actualiza el Producto correspondiente por codigo (ver
    ProductoService.obtener_o_crear) antes de armar la factura real."""

    codigo: str
    nombre: str
    tipo: str = "bien"
    descripcion: str | None = None
    unidad_medida: str
    tributo: str | None = None
    tarifa_impuesto: float = 0
    cantidad: float
    precio_unitario: float

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_VALIDOS:
            raise ValueError("El tipo debe ser 'bien' o 'servicio'.")
        return v

    @field_validator("codigo")
    @classmethod
    def codigo_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El codigo del item es obligatorio.")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre del item es obligatorio.")
        return v

    @field_validator("unidad_medida")
    @classmethod
    def unidad_medida_no_vacia(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La unidad de medida es obligatoria.")
        return v

    @field_validator("descripcion", "tributo")
    @classmethod
    def normalizar_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("tarifa_impuesto")
    @classmethod
    def tarifa_en_rango(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("La tarifa de impuesto debe estar entre 0 y 100.")
        return v

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0.")
        return v

    @field_validator("precio_unitario")
    @classmethod
    def precio_positivo(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("El precio debe ser mayor a 0.")
        return v


class CrearFacturaExternaRequest(BaseModel):
    cliente_id: uuid.UUID
    fecha: date
    lineas: list[ItemFacturaExternaRequest]

    @field_validator("lineas")
    @classmethod
    def al_menos_una_linea(cls, v: list[ItemFacturaExternaRequest]) -> list[ItemFacturaExternaRequest]:
        if not v:
            raise ValueError("La factura debe tener al menos una linea.")
        return v


class ActualizarFacturaExternaRequest(CrearFacturaExternaRequest):
    pass
