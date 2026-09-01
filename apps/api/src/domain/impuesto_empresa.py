from datetime import datetime

from pydantic import BaseModel, field_validator


class ImpuestoEmpresaRequestBase(BaseModel):
    tributo: str
    tarifa: float

    @field_validator("tributo")
    @classmethod
    def tributo_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El tributo es obligatorio.")
        return v

    @field_validator("tarifa")
    @classmethod
    def tarifa_en_rango(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("La tarifa debe estar entre 0 y 100.")
        return v


class CrearImpuestoEmpresaRequest(ImpuestoEmpresaRequestBase):
    pass


class ActualizarImpuestoEmpresaRequest(ImpuestoEmpresaRequestBase):
    pass


class ImpuestoEmpresaResponse(BaseModel):
    id: str
    tributo: str
    tarifa: float
    estado: str
    creado: datetime

    @staticmethod
    def from_model(impuesto) -> "ImpuestoEmpresaResponse":
        return ImpuestoEmpresaResponse(
            id=str(impuesto.id),
            tributo=impuesto.tributo,
            tarifa=float(impuesto.tarifa),
            estado=impuesto.estado,
            creado=impuesto.creado,
        )
