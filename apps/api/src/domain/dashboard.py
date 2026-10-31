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


class VentaPaqueteResponse(BaseModel):
    id: str
    empresa_id: str
    razon_social: str
    max_documentos: int
    precio: float
    fecha_compra: datetime


class FinanzasMesResponse(BaseModel):
    """Numeros del mes calendario en curso (hora de Colombia), en COP."""

    mes: str
    documentos_emitidos: int
    # Cupo con el que arranco el mes (sin usar) + paquetes vendidos en el mes.
    documentos_disponibles_inicio_mes: int
    documentos_vendidos_mes: int
    documentos_maximos_mes: int
    ingresos_paquetes: float
    costo_alegra: float
    costo_servidor_cop: float
    costo_servidor_usd: float
    trm_usd_cop: float
    comision: float
    comision_pct: float
    ganancia: float
    ventas: list[VentaPaqueteResponse]


class DashboardKpisResponse(BaseModel):
    total_empresas: int
    empresas_activas: int
    empresas_inactivas: int
    empresas_con_error_alegra: int
    # Emitidos = lo que cuenta Alegra (cada evento); cobrados = lo que se
    # descuenta a los tenants (una vez por factura recibida).
    documentos_emitidos_mes: int
    documentos_cobrados_mes: int
    clientes_proximos_a_vencer: list[ClienteAlertaResponse]
    clientes_proximos_a_agotar_cupo: list[ClienteAlertaResponse]
    ultimas_empresas: list[EmpresaResumen]
    finanzas_mes: FinanzasMesResponse
