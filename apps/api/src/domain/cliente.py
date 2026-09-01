from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class ClienteRequestBase(BaseModel):
    tipo_identificacion: str
    numero_identificacion: str
    nombre: str
    correo_electronico: EmailStr
    telefono: str | None = None
    tipo_organizacion: str | None = None
    regimen: str | None = None
    tributo: str | None = None

    @field_validator("tipo_identificacion")
    @classmethod
    def tipo_identificacion_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El tipo de documento es obligatorio.")
        return v

    @field_validator("numero_identificacion")
    @classmethod
    def numero_identificacion_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El numero de identificacion es obligatorio.")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La razon social / nombre es obligatorio.")
        return v

    @field_validator("telefono", "tipo_organizacion", "regimen", "tributo")
    @classmethod
    def normalizar_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class CrearClienteRequest(ClienteRequestBase):
    pass


class ActualizarClienteRequest(ClienteRequestBase):
    pass


class ClienteResponse(BaseModel):
    id: str
    tipo_identificacion: str
    numero_identificacion: str
    nombre: str
    correo_electronico: str
    telefono: str | None
    tipo_organizacion: str | None
    regimen: str | None
    tributo: str | None
    estado: str
    creado: datetime

    @staticmethod
    def from_model(cliente) -> "ClienteResponse":
        return ClienteResponse(
            id=str(cliente.id),
            tipo_identificacion=cliente.tipo_identificacion,
            numero_identificacion=cliente.numero_identificacion,
            nombre=cliente.nombre,
            correo_electronico=cliente.correo_electronico,
            telefono=cliente.telefono,
            tipo_organizacion=cliente.tipo_organizacion,
            regimen=cliente.regimen,
            tributo=cliente.tributo,
            estado=cliente.estado,
            creado=cliente.creado,
        )


class ConsultarAdquirienteResponse(BaseModel):
    name: str | None = None
    email: str | None = None
