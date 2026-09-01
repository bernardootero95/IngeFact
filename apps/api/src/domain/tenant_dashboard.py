from pydantic import BaseModel


class TenantDashboardResponse(BaseModel):
    facturas_emitidas_mes: int
    clientes_registrados: int
    resolucion_configurada: bool
