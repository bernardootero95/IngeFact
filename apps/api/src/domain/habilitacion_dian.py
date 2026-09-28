import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

TipoHabilitacion = Literal["facturacion", "nomina"]

# Mismo patron que valida Alegra para governmentId (verificado en vivo): no es
# un UUID hexadecimal estricto, admite cualquier alfanumerico.
TEST_SET_ID_PATTERN = re.compile(r"^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$")


class EnviarSetPruebasRequest(BaseModel):
    test_set_id: str

    @field_validator("test_set_id")
    @classmethod
    def formato_test_set_id(cls, v: str) -> str:
        v = v.strip()
        if not TEST_SET_ID_PATTERN.match(v):
            raise ValueError(
                "El TestSetId no tiene el formato esperado (ej. a70562e0-631e-4ceb-aa65-36887b57dc17)."
            )
        return v


class HabilitacionResponse(BaseModel):
    tipo: TipoHabilitacion
    estado: str
    test_set_id: str | None
    estado_set_pruebas: str | None
    errores_set_pruebas: list[str]
    fecha_envio_set_pruebas: datetime | None

    @staticmethod
    def from_model(habilitacion) -> "HabilitacionResponse":
        return HabilitacionResponse(
            tipo=habilitacion.tipo,
            estado=habilitacion.estado,
            test_set_id=habilitacion.test_set_id,
            estado_set_pruebas=habilitacion.estado_set_pruebas,
            errores_set_pruebas=habilitacion.errores_set_pruebas or [],
            fecha_envio_set_pruebas=habilitacion.fecha_envio_set_pruebas,
        )
