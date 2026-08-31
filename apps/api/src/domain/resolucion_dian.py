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

    @model_validator(mode="after")
    def rangos_y_fechas_coherentes(self) -> "GuardarResolucionDianRequest":
        if self.rango_maximo <= self.rango_minimo:
            raise ValueError("El rango maximo debe ser mayor al rango minimo.")
        if self.fecha_fin <= self.fecha_inicio:
            raise ValueError("La fecha fin debe ser posterior a la fecha inicio.")
        return self


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
