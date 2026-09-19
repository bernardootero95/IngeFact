from datetime import datetime

from pydantic import BaseModel, field_validator, model_validator

TIPOS_VALIDOS = ("bien", "servicio")


class ProductoRequestBase(BaseModel):
    tipo: str = "bien"
    codigo: str
    nombre: str
    descripcion: str | None = None
    precio: float
    unidad_medida: str
    tributo: str | None = None
    tarifa_impuesto: float = 0
    valor_impuesto_excluido: float = 0

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
            raise ValueError("El codigo interno es obligatorio.")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre es obligatorio.")
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

    @field_validator("precio")
    @classmethod
    def precio_no_negativo(cls, v: float) -> float:
        if v < 0:
            raise ValueError("El precio debe ser mayor o igual a 0.")
        return v

    @field_validator("tarifa_impuesto")
    @classmethod
    def tarifa_en_rango(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("La tarifa de impuesto debe estar entre 0 y 100.")
        return v

    @field_validator("valor_impuesto_excluido")
    @classmethod
    def valor_impuesto_excluido_no_negativo(cls, v: float) -> float:
        if v < 0:
            raise ValueError("El impuesto excluido de IVA debe ser mayor o igual a 0.")
        return v

    @model_validator(mode="after")
    def valor_impuesto_excluido_dentro_del_precio(self) -> "ProductoRequestBase":
        if self.valor_impuesto_excluido > self.precio:
            raise ValueError("El impuesto excluido de IVA no puede ser mayor al precio.")
        return self


class CrearProductoRequest(ProductoRequestBase):
    pass


class ActualizarProductoRequest(ProductoRequestBase):
    pass


class ProductoResponse(BaseModel):
    id: str
    tipo: str
    codigo: str
    nombre: str
    descripcion: str | None
    precio: float
    unidad_medida: str
    tributo: str | None
    tarifa_impuesto: float
    valor_impuesto_excluido: float
    estado: str
    creado: datetime

    @staticmethod
    def from_model(producto) -> "ProductoResponse":
        return ProductoResponse(
            id=str(producto.id),
            tipo=producto.tipo,
            codigo=producto.codigo,
            nombre=producto.nombre,
            descripcion=producto.descripcion,
            precio=float(producto.precio),
            unidad_medida=producto.unidad_medida,
            tributo=producto.tributo,
            tarifa_impuesto=float(producto.tarifa_impuesto),
            valor_impuesto_excluido=float(producto.valor_impuesto_excluido),
            estado=producto.estado,
            creado=producto.creado,
        )
