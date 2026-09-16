from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from src.core.nit import NIT_IDENTIFICATION_TYPE, is_valid_dv


class ProveedorRequestBase(BaseModel):
    tipo_identificacion: str
    numero_identificacion: str
    digito_verificacion: str | None = None
    nombre: str
    correo_electronico: EmailStr
    telefono: str | None = None
    tipo_organizacion: str | None = None
    regimen_fiscal: str | None = None
    regimen: str | None = None
    tributo: str | None = None
    direccion: str | None = None
    departamento: str | None = None
    municipio: str | None = None

    @model_validator(mode="after")
    def dv_obligatorio_y_valido_si_es_nit(self) -> "ProveedorRequestBase":
        """Mismo criterio que Cliente -- el DV solo aplica a proveedores
        identificados con NIT ("31")."""
        if self.tipo_identificacion == NIT_IDENTIFICATION_TYPE:
            if not self.digito_verificacion or not self.digito_verificacion.strip():
                raise ValueError("El digito de verificacion es obligatorio para proveedores con NIT.")
            if not is_valid_dv(self.numero_identificacion, self.digito_verificacion):
                raise ValueError("El digito de verificacion no corresponde al NIT.")
        else:
            self.digito_verificacion = None
        return self

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

    @field_validator("telefono", "tipo_organizacion", "regimen", "tributo", "direccion", "departamento", "municipio")
    @classmethod
    def normalizar_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("regimen_fiscal")
    @classmethod
    def regimen_fiscal_valido(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if v not in ("48", "49"):
            raise ValueError("El regimen fiscal debe ser 48 (responsable de IVA) o 49 (no responsable).")
        return v


class CrearProveedorRequest(ProveedorRequestBase):
    pass


class ActualizarProveedorRequest(ProveedorRequestBase):
    pass


class ProveedorResponse(BaseModel):
    id: str
    tipo_identificacion: str
    numero_identificacion: str
    digito_verificacion: str | None
    nombre: str
    correo_electronico: str
    telefono: str | None
    tipo_organizacion: str | None
    regimen_fiscal: str | None
    regimen: str | None
    tributo: str | None
    direccion: str | None
    departamento: str | None
    municipio: str | None
    estado: str
    creado: datetime

    @staticmethod
    def from_model(proveedor) -> "ProveedorResponse":
        return ProveedorResponse(
            id=str(proveedor.id),
            tipo_identificacion=proveedor.tipo_identificacion,
            numero_identificacion=proveedor.numero_identificacion,
            digito_verificacion=proveedor.digito_verificacion,
            nombre=proveedor.nombre,
            correo_electronico=proveedor.correo_electronico,
            telefono=proveedor.telefono,
            tipo_organizacion=proveedor.tipo_organizacion,
            regimen_fiscal=proveedor.regimen_fiscal,
            regimen=proveedor.regimen,
            tributo=proveedor.tributo,
            direccion=proveedor.direccion,
            departamento=proveedor.departamento,
            municipio=proveedor.municipio,
            estado=proveedor.estado,
            creado=proveedor.creado,
        )


class ConsultarProveedorDianResponse(BaseModel):
    name: str | None = None
    email: str | None = None
