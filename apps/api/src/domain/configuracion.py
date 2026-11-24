import uuid

from pydantic import BaseModel, Field


class ConfiguracionNegocioResponse(BaseModel):
    costo_servidor_usd: float
    trm_usd_cop: float
    comision_paquetes_pct: float
    # Empresa que emite la factura de los paquetes vendidos (None = no hay
    # ninguna configurada ni existe la del NIT por defecto).
    empresa_facturadora_id: str | None = None
    empresa_facturadora_nombre: str | None = None


class ConfiguracionNegocioRequest(BaseModel):
    costo_servidor_usd: float = Field(ge=0, le=100000)
    trm_usd_cop: float = Field(gt=0, le=100000)
    comision_paquetes_pct: float = Field(ge=0, le=100)
    # None = no cambiar la empresa facturadora.
    empresa_facturadora_id: uuid.UUID | None = None
