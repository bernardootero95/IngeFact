from datetime import datetime

from pydantic import BaseModel


class EmpresaResumen(BaseModel):
    id: str
    razon_social: str
    estado: str
    creado: datetime


class DashboardKpisResponse(BaseModel):
    total_empresas: int
    empresas_activas: int
    empresas_inactivas: int
    empresas_con_error_alegra: int
    documentos_emitidos_mes: int
    ultimas_empresas: list[EmpresaResumen]
