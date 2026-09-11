from datetime import datetime

from pydantic import BaseModel, field_validator


class CrearApiKeyRequest(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre de la key es obligatorio.")
        return v


class ApiKeyResponse(BaseModel):
    id: str
    nombre: str
    prefijo: str
    ultimo_uso: datetime | None
    revocada: datetime | None
    creado: datetime

    @staticmethod
    def from_model(api_key) -> "ApiKeyResponse":
        return ApiKeyResponse(
            id=str(api_key.id),
            nombre=api_key.nombre,
            prefijo=api_key.prefijo,
            ultimo_uso=api_key.ultimo_uso,
            revocada=api_key.revocada,
            creado=api_key.creado,
        )


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Unica respuesta que incluye el valor en claro de la key -- no se
    vuelve a mostrar despues de esta llamada."""

    api_key: str
