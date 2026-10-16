from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.application.suscripcion_service import UMBRAL_ALERTA_CUOTA, contar_documentos_usados
from src.core.config import get_settings
from src.core.precio_paquete import costo_alegra_mes
from src.core.tiempo import ZONA_HORARIA_COLOMBIA, hoy_colombia
from src.infrastructure.db.models import DocumentoSoporte, Empresa, Factura, NotaCredito, NotaDebito, Suscripcion, VentaPaquete

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
        documentos_mes = self._contar_documentos_emitidos_mes()

        return {
            "total_empresas": sum(conteos.values()),
            "empresas_activas": conteos.get("activo", 0),
            "empresas_inactivas": conteos.get("inactivo", 0),
            "empresas_con_error_alegra": conteos.get("error_alegra", 0),
            "documentos_emitidos_mes": documentos_mes,
            "clientes_proximos_a_vencer": proximos_a_vencer,
            "clientes_proximos_a_agotar_cupo": proximos_a_agotar_cupo,
            "finanzas_mes": self._finanzas_mes(documentos_mes),
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

    @staticmethod
    def _inicio_mes() -> datetime:
        ahora_co = datetime.now(ZONA_HORARIA_COLOMBIA)
        return datetime(ahora_co.year, ahora_co.month, 1, tzinfo=ZONA_HORARIA_COLOMBIA)

    def _finanzas_mes(self, documentos_emitidos: int) -> dict:
        """Ingresos, costos y ganancia del mes calendario.

        - Disponibles al inicio: cupo sin usar de las suscripciones que ya
          estaban vigentes el 1ro (las que arrancaron este mes se cuentan
          por su venta, porque cambiar_plan reemplaza el paquete anterior).
        - Costo de Alegra: mensualidad + tarifa por los documentos del mes
          que exceden los incluidos (ver core/precio_paquete.py).
        - Ganancia = paquetes vendidos - Alegra - servidor - comision."""
        settings = get_settings()
        inicio_mes = self._inicio_mes()

        disponibles_inicio = 0
        suscripciones = self.db.execute(
            select(Suscripcion).where(
                Suscripcion.estado == "activa",
                Suscripcion.fecha_inicio < inicio_mes.date(),
            )
        ).scalars()
        for suscripcion in suscripciones:
            usados = contar_documentos_usados(self.db, suscripcion, hasta=inicio_mes)
            disponibles_inicio += max(0, suscripcion.max_documentos - usados)

        filas = self.db.execute(
            select(VentaPaquete, Empresa)
            .join(Empresa, Empresa.id == VentaPaquete.empresa_id)
            .where(VentaPaquete.creado >= inicio_mes)
            .order_by(VentaPaquete.creado.desc())
        ).all()
        ventas = [
            {
                "id": str(venta.id),
                "empresa_id": str(empresa.id),
                "razon_social": empresa.razon_social,
                "max_documentos": venta.max_documentos,
                "precio": float(venta.precio),
                "fecha_compra": venta.creado,
            }
            for venta, empresa in filas
        ]
        documentos_vendidos = sum(v["max_documentos"] for v in ventas)
        ingresos = sum(v["precio"] for v in ventas)

        costo_alegra = costo_alegra_mes(documentos_emitidos)
        costo_servidor = settings.costo_servidor_usd * settings.trm_usd_cop
        comision = ingresos * settings.comision_paquetes_pct / 100

        return {
            "mes": f"{inicio_mes.year}-{inicio_mes.month:02d}",
            "documentos_emitidos": documentos_emitidos,
            "documentos_disponibles_inicio_mes": disponibles_inicio,
            "documentos_vendidos_mes": documentos_vendidos,
            "documentos_maximos_mes": disponibles_inicio + documentos_vendidos,
            "ingresos_paquetes": ingresos,
            "costo_alegra": costo_alegra,
            "costo_servidor_cop": costo_servidor,
            "costo_servidor_usd": settings.costo_servidor_usd,
            "trm_usd_cop": settings.trm_usd_cop,
            "comision": comision,
            "comision_pct": settings.comision_paquetes_pct,
            "ganancia": ingresos - costo_alegra - costo_servidor - comision,
            "ventas": ventas,
        }

    def _contar_documentos_emitidos_mes(self) -> int:
        """Cuenta los 4 tipos de documento (Factura/NotaCredito/NotaDebito/
        DocumentoSoporte) que se enviaron a la DIAN este mes calendario --
        `estado != 'borrador'` (se intento enviar, sin importar si la DIAN
        lo acepto o rechazo) es la metrica de actividad de la plataforma,
        no de facturacion (para eso esta contar_documentos_usados, que solo
        cuenta aceptados y no incluye Documento Soporte).

        "Este mes" es el mes calendario en hora de Colombia, no la del
        servidor (en produccion el contenedor corre en UTC) -- el limite
        del 1ro de mes se calcula en America/Bogota y luego se compara tal
        cual contra `fecha_envio` (datetime aware, Python normaliza la
        comparacion entre zonas correctamente)."""
        inicio_mes = self._inicio_mes()

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
        de que el cliente la reciba). "Hoy" es el dia calendario en
        Colombia, no el del servidor -- ver hoy_colombia()."""
        hoy = hoy_colombia()
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
