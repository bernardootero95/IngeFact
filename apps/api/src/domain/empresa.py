from datetime import date, datetime

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
    tipo_organizacion: str | None = None
    telefono: str | None = None
    correo_electronico: EmailStr
    notificacion_correo: bool = True

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


class SuscripcionResponse(BaseModel):
    max_documentos: int
    documentos_usados: int
    fecha_inicio: date
    fecha_fin: date
    estado: str

    model_config = {"from_attributes": True}


class EmpresaDetailResponse(BaseModel):
    id: str
    razon_social: str
    nombre_comercial: str | None
    numero_identificacion: str
    digito_verificacion: str
    direccion: str | None
    departamento: str | None
    municipio: str | None
    regimen: str | None
    tipo_organizacion: str | None
    telefono: str | None
    correo_electronico: str | None
    notificacion_correo: bool
    id_alegra: str | None
    estado: str
    creado: datetime
    suscripcion: SuscripcionResponse | None = None

    @staticmethod
    def from_empresa(empresa) -> "EmpresaDetailResponse":
        activa = next((s for s in empresa.suscripciones if s.estado == "activa"), None)
        return EmpresaDetailResponse(
            id=str(empresa.id),
            razon_social=empresa.razon_social,
            nombre_comercial=empresa.nombre_comercial,
            numero_identificacion=empresa.numero_identificacion,
            digito_verificacion=empresa.digito_verificacion,
            direccion=empresa.direccion,
            departamento=empresa.departamento,
            municipio=empresa.municipio,
            regimen=empresa.regimen,
            tipo_organizacion=empresa.tipo_organizacion,
            telefono=empresa.telefono,
            correo_electronico=empresa.correo_electronico,
            notificacion_correo=empresa.notificacion_correo,
            id_alegra=empresa.id_alegra,
            estado=empresa.estado,
            creado=empresa.creado,
            suscripcion=SuscripcionResponse.model_validate(activa) if activa else None,
        )


class ActualizarEmpresaRequest(BaseModel):
    razon_social: str
    nombre_comercial: str | None = None
    direccion: str | None = None
    departamento: str | None = None
    municipio: str | None = None
    regimen: str | None = None
    tipo_organizacion: str | None = None
    telefono: str | None = None
    notificacion_correo: bool = True
    estado: str = "activo"

    @field_validator("razon_social")
    @classmethod
    def razon_social_no_vacia(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La razon social es obligatoria.")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ("activo", "inactivo"):
            raise ValueError("El estado debe ser 'activo' o 'inactivo'.")
        return v


class ActualizarDatosContactoRequest(BaseModel):
    """Subconjunto de campos que el propio tenant puede editar -- el resto
    (razon social, NIT, correo) son de solo lectura para el tenant, los
    administra staff desde apps/admin."""

    nombre_comercial: str | None = None
    telefono: str | None = None
    direccion: str | None = None

    @field_validator("nombre_comercial", "telefono", "direccion")
    @classmethod
    def normalizar(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class CambiarPlanRequest(BaseModel):
    max_documentos: int
    fecha_inicio: date
    fecha_fin: date

    @field_validator("max_documentos")
    @classmethod
    def max_documentos_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("max_documentos debe ser mayor a 0.")
        return v

    @model_validator(mode="after")
    def fechas_coherentes(self) -> "CambiarPlanRequest":
        if self.fecha_fin <= self.fecha_inicio:
            raise ValueError("fecha_fin debe ser posterior a fecha_inicio.")
        return self
