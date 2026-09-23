from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator


class GuardarResolucionDianRequest(BaseModel):
    numero_resolucion: str
    prefijo: str
    rango_minimo: int
    rango_maximo: int
    fecha_inicio: date
    fecha_fin: date
    technical_key: str
    consecutivo_actual: int | None = None

    @field_validator("numero_resolucion", "prefijo", "technical_key")
    @classmethod
    def no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El campo no puede estar vacio.")
        return v

    @field_validator("rango_minimo", "rango_maximo")
    @classmethod
    def rango_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El rango debe ser mayor a 0.")
        return v

    @field_validator("consecutivo_actual")
    @classmethod
    def consecutivo_positivo(cls, v: int | None) -> int | None:
        if v is not None and v <= 0:
            raise ValueError("El consecutivo actual debe ser mayor a 0.")
        return v

    @model_validator(mode="after")
    def rangos_y_fechas_coherentes(self) -> "GuardarResolucionDianRequest":
        if self.rango_maximo <= self.rango_minimo:
            raise ValueError("El rango maximo debe ser mayor al rango minimo.")
        if self.fecha_fin <= self.fecha_inicio:
            raise ValueError("La fecha fin debe ser posterior a la fecha inicio.")
        if self.consecutivo_actual is not None and not (
            self.rango_minimo <= self.consecutivo_actual <= self.rango_maximo
        ):
            raise ValueError("El consecutivo actual debe estar entre el rango minimo y el rango maximo.")
        return self


class CargarResolucionAlegraResponse(BaseModel):
    """Una resolucion tal como la tiene registrada Alegra para el NIT del
    tenant (GET /resolutions/{nit}, solo produccion). El tenant elige cual
    usar y confirma con "Guardar Cambios" -- no se persiste automaticamente."""

    numero_resolucion: str
    prefijo: str
    rango_minimo: int
    rango_maximo: int
    fecha_inicio: date
    fecha_fin: date
    technical_key: str


class ListaResolucionesAlegraResponse(BaseModel):
    """Todas las resoluciones que Alegra tiene registradas para el NIT del
    tenant -- GET /resolutions/{nit} las devuelve todas en un arreglo, sin
    ningun campo de estado (activa/agotada/vencida) ni orden documentado
    (confirmado contra https://e-provider-docs.alegra.com/reference/getresolutions,
    2026-09-22), asi que no hay forma confiable de adivinar cual es la
    vigente del lado del backend. El tenant elige la correcta a mano."""

    resoluciones: list[CargarResolucionAlegraResponse]


class ResolucionDianResponse(BaseModel):
    id: str
    numero_resolucion: str
    prefijo: str
    rango_minimo: int
    rango_maximo: int
    fecha_inicio: date
    fecha_fin: date
    technical_key: str
    consecutivo_actual: int
    estado_validacion: str
    mensaje_validacion: str | None
    fecha_ultima_validacion: datetime | None

    @staticmethod
    def from_model(resolucion) -> "ResolucionDianResponse":
        return ResolucionDianResponse(
            id=str(resolucion.id),
            numero_resolucion=resolucion.numero_resolucion,
            prefijo=resolucion.prefijo,
            rango_minimo=resolucion.rango_minimo,
            rango_maximo=resolucion.rango_maximo,
            fecha_inicio=resolucion.fecha_inicio,
            fecha_fin=resolucion.fecha_fin,
            technical_key=resolucion.technical_key,
            consecutivo_actual=resolucion.consecutivo_actual,
            estado_validacion=resolucion.estado_validacion,
            mensaje_validacion=resolucion.mensaje_validacion,
            fecha_ultima_validacion=resolucion.fecha_ultima_validacion,
        )
