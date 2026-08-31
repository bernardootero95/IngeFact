from pydantic import BaseModel


class TenantDashboardResponse(BaseModel):
    facturas_emitidas_mes: int
    resolucion_configurada: bool
