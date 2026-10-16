from pydantic import BaseModel, Field


class ConfiguracionNegocioResponse(BaseModel):
    costo_servidor_usd: float
    trm_usd_cop: float
    comision_paquetes_pct: float


class ConfiguracionNegocioRequest(BaseModel):
    costo_servidor_usd: float = Field(ge=0, le=100000)
    trm_usd_cop: float = Field(gt=0, le=100000)
    comision_paquetes_pct: float = Field(ge=0, le=100)
