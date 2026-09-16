from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator


class GuardarResolucionDocumentoSoporteRequest(BaseModel):
    numero_resolucion: str
    prefijo: str
    rango_minimo: int
    rango_maximo: int
    fecha_inicio: date
    fecha_fin: date
    consecutivo_actual: int | None = None

    @field_validator("numero_resolucion", "prefijo")
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
    def rangos_y_fechas_coherentes(self) -> "GuardarResolucionDocumentoSoporteRequest":
        if self.rango_maximo <= self.rango_minimo:
            raise ValueError("El rango maximo debe ser mayor al rango minimo.")
        if self.fecha_fin <= self.fecha_inicio:
            raise ValueError("La fecha fin debe ser posterior a la fecha inicio.")
        if self.consecutivo_actual is not None and not (
            self.rango_minimo <= self.consecutivo_actual <= self.rango_maximo
        ):
            raise ValueError("El consecutivo actual debe estar entre el rango minimo y el rango maximo.")
        return self


class ResolucionDocumentoSoporteResponse(BaseModel):
    id: str
    numero_resolucion: str
    prefijo: str
    rango_minimo: int
    rango_maximo: int
    fecha_inicio: date
    fecha_fin: date
    consecutivo_actual: int
    creado: datetime

    @staticmethod
    def from_model(resolucion) -> "ResolucionDocumentoSoporteResponse":
        return ResolucionDocumentoSoporteResponse(
            id=str(resolucion.id),
            numero_resolucion=resolucion.numero_resolucion,
            prefijo=resolucion.prefijo,
            rango_minimo=resolucion.rango_minimo,
            rango_maximo=resolucion.rango_maximo,
            fecha_inicio=resolucion.fecha_inicio,
            fecha_fin=resolucion.fecha_fin,
            consecutivo_actual=resolucion.consecutivo_actual,
            creado=resolucion.creado,
        )
