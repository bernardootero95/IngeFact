from pydantic import BaseModel, EmailStr, field_validator, model_validator

from src.core.nit import is_valid_dv


class CrearEmpresaRequest(BaseModel):
    razon_social: str
    nombre_comercial: str | None = None
    numero_identificacion: str
    digito_verificacion: str
    tipo_identificacion: str = "31"
    direccion: str | None = None
    departamento: str | None = None
    municipio: str | None = None
    regimen: str = "R-99-PN"
    telefono: str | None = None
    correo_electronico: EmailStr

    @field_validator("razon_social")
    @classmethod
    def razon_social_no_vacia(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La razon social es obligatoria.")
        if len(v) > 200:
            raise ValueError("La razon social no puede superar 200 caracteres.")
        return v

    @field_validator("numero_identificacion")
    @classmethod
    def nit_formato(cls, v: str) -> str:
        v = v.strip()
        if not (8 <= len(v) <= 10) or not v.isdigit():
            raise ValueError("El NIT debe tener entre 8 y 10 digitos numericos.")
        return v

    @model_validator(mode="after")
    def dv_valido(self) -> "CrearEmpresaRequest":
        if not is_valid_dv(self.numero_identificacion, self.digito_verificacion):
            raise ValueError("El digito de verificacion no corresponde al NIT.")
        return self


class EmpresaResponse(BaseModel):
    id: str
    razon_social: str
    numero_identificacion: str
    id_alegra: str | None
    estado: str
