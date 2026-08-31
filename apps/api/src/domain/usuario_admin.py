import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class CrearUsuarioAdminRequest(BaseModel):
    nombre: str
    email: EmailStr

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres.")
        return v


class ActualizarUsuarioAdminRequest(BaseModel):
    nombre: str
    estado: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres.")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ("activo", "inactivo"):
            raise ValueError("El estado debe ser 'activo' o 'inactivo'.")
        return v


class UsuarioAdminResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    email: str
    rol: str
    estado: str
    creado: datetime

    model_config = {"from_attributes": True}
