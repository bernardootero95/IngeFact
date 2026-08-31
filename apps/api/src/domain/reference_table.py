from datetime import datetime

from pydantic import BaseModel, field_validator

VALID_TABLES = (
    "paises",
    "departamentos",
    "municipios",
    "monedas",
    "formas_pago",
    "metodos_pago",
    "tipos_organizacion",
    "responsabilidades_fiscales",
    "tributos",
    "tipos_identificacion",
    "tipos_unidad",
    "conceptos_nota_credito",
    "conceptos_nota_debito",
)


class ReferenceRecordRequest(BaseModel):
    code: str
    value: str
    estado: str = "activo"
    department_code: str | None = None
    department_value: str | None = None
    value_nade: str | None = None

    @field_validator("code", "value")
    @classmethod
    def no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Este campo es obligatorio.")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ("activo", "inactivo"):
            raise ValueError("El estado debe ser 'activo' o 'inactivo'.")
        return v


class ReferenceRecordResponse(BaseModel):
    id: str
    code: str
    value: str
    estado: str
    department_code: str | None = None
    department_value: str | None = None
    value_nade: str | None = None
    actualizado: datetime

    @staticmethod
    def from_record(record) -> "ReferenceRecordResponse":
        return ReferenceRecordResponse(
            id=str(record.id),
            code=record.code,
            value=record.value,
            estado=record.estado,
            department_code=getattr(record, "department_code", None),
            department_value=getattr(record, "department_value", None),
            value_nade=getattr(record, "value_nade", None),
            actualizado=record.actualizado,
        )
