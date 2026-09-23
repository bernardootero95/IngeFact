from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.application.suscripcion_service import UMBRAL_ALERTA_CUOTA, contar_documentos_usados
from src.infrastructure.db.models import DocumentoSoporte, Empresa, Factura, NotaCredito, NotaDebito, Suscripcion

DIAS_ALERTA_VENCIMIENTO_PLAN = 30

DOCUMENTOS_EMITIDOS = (Factura, NotaCredito, NotaDebito, DocumentoSoporte)


class DashboardService:
    """KPIs reales del panel admin."""

    def __init__(self, db: Session):
        self.db = db

    def obtener_kpis(self) -> dict:
        conteos = dict(
            self.db.execute(select(Empresa.estado, func.count()).group_by(Empresa.estado)).all()
        )
        ultimas = (
            self.db.execute(select(Empresa).order_by(Empresa.creado.desc()).limit(5)).scalars().all()
        )
        proximos_a_vencer, proximos_a_agotar_cupo = self._alertas_clientes()

        return {
            "total_empresas": sum(conteos.values()),
            "empresas_activas": conteos.get("activo", 0),
            "empresas_inactivas": conteos.get("inactivo", 0),
            "empresas_con_error_alegra": conteos.get("error_alegra", 0),
            "documentos_emitidos_mes": self._contar_documentos_emitidos_mes(),
            "clientes_proximos_a_vencer": proximos_a_vencer,
            "clientes_proximos_a_agotar_cupo": proximos_a_agotar_cupo,
            "ultimas_empresas": [
                {
                    "id": str(e.id),
                    "razon_social": e.razon_social,
                    "estado": e.estado,
                    "creado": e.creado,
                }
                for e in ultimas
            ],
        }

    def _contar_documentos_emitidos_mes(self) -> int:
        """Cuenta los 4 tipos de documento (Factura/NotaCredito/NotaDebito/
        DocumentoSoporte) que se enviaron a la DIAN este mes calendario --
        `estado != 'borrador'` (se intento enviar, sin importar si la DIAN
        lo acepto o rechazo) es la metrica de actividad de la plataforma,
        no de facturacion (para eso esta contar_documentos_usados, que solo
        cuenta aceptados y no incluye Documento Soporte)."""
        ahora = datetime.now(timezone.utc)
        inicio_mes = datetime(ahora.year, ahora.month, 1, tzinfo=timezone.utc)

        total = 0
        for modelo in DOCUMENTOS_EMITIDOS:
            total += self.db.execute(
                select(func.count())
                .select_from(modelo)
                .where(modelo.estado != "borrador", modelo.fecha_envio >= inicio_mes)
            ).scalar_one()
        return total

    def _alertas_clientes(self) -> tuple[list[dict], list[dict]]:
        """Estado de cada suscripcion activa frente a los dos umbrales que
        le importan al admin: vencimiento del plan (<=30 dias, mismo umbral
        que ya usa ResolutionPanel.jsx en el panel del tenant para su
        Resolucion DIAN) y cupo de documentos (90%, mismo umbral que
        revisar_alerta_cuota_por_empresa usa para avisarle por correo al
        tenant -- se reutiliza para que el admin vea la misma senal antes
        de que el cliente la reciba)."""
        hoy = date.today()
        filas = self.db.execute(
            select(Suscripcion, Empresa)
            .join(Empresa, Empresa.id == Suscripcion.empresa_id)
            .where(Suscripcion.estado == "activa")
        ).all()

        proximos_a_vencer, proximos_a_agotar_cupo = [], []
        for suscripcion, empresa in filas:
            documentos_usados = contar_documentos_usados(self.db, suscripcion)
            porcentaje_usado = (
                documentos_usados / suscripcion.max_documentos if suscripcion.max_documentos else 0.0
            )
            dias_para_vencer = (suscripcion.fecha_fin - hoy).days
            item = {
                "empresa_id": str(empresa.id),
                "razon_social": empresa.razon_social,
                "max_documentos": suscripcion.max_documentos,
                "documentos_usados": documentos_usados,
                "porcentaje_usado": round(porcentaje_usado * 100, 1),
                "fecha_fin_plan": suscripcion.fecha_fin,
                "dias_para_vencer": dias_para_vencer,
            }
            if dias_para_vencer <= DIAS_ALERTA_VENCIMIENTO_PLAN:
                proximos_a_vencer.append(item)
            if porcentaje_usado >= UMBRAL_ALERTA_CUOTA:
                proximos_a_agotar_cupo.append(item)

        proximos_a_vencer.sort(key=lambda i: i["dias_para_vencer"])
        proximos_a_agotar_cupo.sort(key=lambda i: i["porcentaje_usado"], reverse=True)
        return proximos_a_vencer, proximos_a_agotar_cupo
