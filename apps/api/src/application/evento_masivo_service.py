import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.factura_recibida_service import FacturaRecibidaService
from src.application.suscripcion_service import (
    documentos_disponibles,
    mensaje_cupo_insuficiente,
    motivo_plan_no_vigente,
    verificar_cupo_para,
)
from src.core.alegra_client import AlegraClient
from src.domain.evento_masivo import (
    MAX_FACTURAS_EVENTO_MASIVO,
    MOTIVO_RECHAZO_GENERICO,
    MOTIVO_YA_NO_APLICA,
    RESULTADO_EVENTO_ACEPTADO,
    RESULTADO_EVENTO_FALLIDO,
    CriteriosEventoMasivoRequest,
    EmitirEventoMasivoRequest,
    FacturaEventoMasivoResponse,
    ResultadoEventoMasivoResponse,
    ValidacionEventoMasivoResponse,
)
from src.domain.factura_recibida import ESTADOS_EVENTO_ACEPTADO, eventos_permitidos, factura_recibida_cobrada
from src.infrastructure.db.models import FacturaRecibida


class EventoMasivoService:
    """Aplica un mismo evento DIAN a varias facturas recibidas. Reutiliza el
    envio individual (FacturaRecibidaService.enviar_evento) y el orden RADIAN
    (eventos_permitidos): solo entran las facturas a las que el evento
    todavia se les puede aplicar segun los eventos que ya tienen."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._facturas = FacturaRecibidaService(db, alegra_client=alegra_client)

    def candidatas(self, empresa_id: uuid.UUID, criterios: CriteriosEventoMasivoRequest) -> list[FacturaRecibida]:
        query = (
            select(FacturaRecibida)
            .where(
                FacturaRecibida.empresa_id == empresa_id,
                FacturaRecibida.eliminado.is_(None),
                FacturaRecibida.fecha >= criterios.fecha_desde,
                FacturaRecibida.fecha <= criterios.fecha_hasta,
            )
            .options(selectinload(FacturaRecibida.eventos))
            .order_by(FacturaRecibida.fecha, FacturaRecibida.numero_documento_proveedor)
        )
        if criterios.proveedor_nit:
            query = query.where(FacturaRecibida.proveedor_nit == criterios.proveedor_nit)
        facturas = self.db.execute(query).scalars().all()
        return [f for f in facturas if criterios.tipo in eventos_permitidos(f.eventos)]

    def validar(self, empresa_id: uuid.UUID, criterios: CriteriosEventoMasivoRequest) -> ValidacionEventoMasivoResponse:
        facturas = self.candidatas(empresa_id, criterios)
        necesarios = _documentos_necesarios(facturas)
        disponibles = documentos_disponibles(self.db, empresa_id)
        bloqueo = None
        if len(facturas) > MAX_FACTURAS_EVENTO_MASIVO:
            bloqueo = (
                f"Son {len(facturas)} facturas y el máximo por envío es {MAX_FACTURAS_EVENTO_MASIVO}. "
                "Acorta el rango de fechas o filtra por proveedor."
            )
        elif facturas:
            bloqueo = motivo_plan_no_vigente(self.db, empresa_id) or mensaje_cupo_insuficiente(disponibles, necesarios)
        return ValidacionEventoMasivoResponse(
            cantidad=len(facturas),
            facturas=[FacturaEventoMasivoResponse.from_model(f) for f in facturas],
            maximo=MAX_FACTURAS_EVENTO_MASIVO,
            documentos_necesarios=necesarios,
            documentos_disponibles=disponibles or 0,
            bloqueo=bloqueo,
        )

    def emitir(self, empresa_id: uuid.UUID, data: EmitirEventoMasivoRequest) -> list[ResultadoEventoMasivoResponse]:
        """Envia una tanda. Antes de transmitir nada exige plan vigente y
        cupo para las facturas validas de la tanda que aun no se han cobrado;
        despues, un fallo no detiene el resto: cada factura trae su propio
        resultado."""
        empresa = self._facturas.empresa_habilitada(empresa_id)
        vigentes = {f.id: f for f in self.candidatas(empresa_id, data)}
        validas = [vigentes[i] for i in data.factura_ids if i in vigentes]
        verificar_cupo_para(self.db, empresa_id, _documentos_necesarios(validas))

        evento = data.evento()
        resultados = []
        for factura_id in data.factura_ids:
            factura = vigentes.get(factura_id)
            if factura is None:
                resultados.append(_resultado(factura_id, None, RESULTADO_EVENTO_FALLIDO, MOTIVO_YA_NO_APLICA))
                continue
            try:
                registrado = self._facturas.enviar_evento(empresa, factura, evento)
            except HTTPException as exc:
                self.db.rollback()
                resultados.append(_resultado(factura_id, factura, RESULTADO_EVENTO_FALLIDO, exc.detail))
                continue
            if registrado.legal_status in ESTADOS_EVENTO_ACEPTADO:
                resultados.append(_resultado(factura_id, factura, RESULTADO_EVENTO_ACEPTADO, None))
            else:
                motivo = registrado.razon_rechazo or MOTIVO_RECHAZO_GENERICO
                resultados.append(_resultado(factura_id, factura, RESULTADO_EVENTO_FALLIDO, motivo))
        return resultados


def _documentos_necesarios(facturas: list[FacturaRecibida]) -> int:
    """Solo descuentan las facturas sin un evento aceptado previo."""
    return sum(1 for f in facturas if not factura_recibida_cobrada(f.eventos))


def _resultado(factura_id, factura, resultado: str, mensaje: str | None) -> ResultadoEventoMasivoResponse:
    return ResultadoEventoMasivoResponse(
        factura_id=str(factura_id),
        numero=factura.numero_documento_proveedor if factura else None,
        proveedor_nombre=factura.proveedor_nombre if factura else None,
        resultado=resultado,
        mensaje=mensaje,
    )
