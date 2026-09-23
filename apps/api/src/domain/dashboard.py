from datetime import date, datetime

from pydantic import BaseModel


class EmpresaResumen(BaseModel):
    id: str
    razon_social: str
    estado: str
    creado: datetime


class ClienteAlertaResponse(BaseModel):
    """Estado de la suscripcion activa de un cliente frente a los dos
    umbrales que le importan al admin para saber a quien contactar: se le
    acaba el periodo del plan, o se le acaba el cupo de documentos (mismo
    umbral que ya usa la alerta por correo al tenant, ver
    suscripcion_service.UMBRAL_ALERTA_CUOTA)."""

    empresa_id: str
    razon_social: str
    max_documentos: int
    documentos_usados: int
    porcentaje_usado: float
    fecha_fin_plan: date
    dias_para_vencer: int


class DashboardKpisResponse(BaseModel):
    total_empresas: int
    empresas_activas: int
    empresas_inactivas: int
    empresas_con_error_alegra: int
    documentos_emitidos_mes: int
    clientes_proximos_a_vencer: list[ClienteAlertaResponse]
    clientes_proximos_a_agotar_cupo: list[ClienteAlertaResponse]
    ultimas_empresas: list[EmpresaResumen]
