"""Reconciliacion de facturas que quedaron en 'enviada'.

Hallazgo real en produccion (2026-09-28): 179 facturas de un tenant que
factura por API quedaron en 'enviada' -- todas del 2026-09-23 entre las
02:17 y las 11:54 UTC. Alegra respondio el POST /invoices sin legalStatus
final (la DIAN no alcanzo a resolver en la respuesta sincrona) y el webhook
invoices.emissionFinished nunca llego (0 recibidos en los logs), asi que
nada las movia de estado: no descontaban cupo (contar_documentos_usados
solo cuenta 'aceptada'/'anulada') pero si aparecian en el KPI de actividad
del admin (cuenta todo lo que no es 'borrador').

Esto re-consulta cada una a Alegra (GET /invoices/{id}) y le aplica el
legalStatus real con la misma regla que enviar() y el webhook
(aplicar_estado_legal). Es idempotente: solo toca facturas en 'enviada', y
una que Alegra siga sin resolver se deja igual para el siguiente intento.
"""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.factura_service import aplicar_estado_legal, notificar_factura_aceptada
from src.application.suscripcion_service import revisar_alerta_cuota_sin_romper
from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.infrastructure.db.models import Factura

logger = logging.getLogger(__name__)

# Margen para no competir con un envio que la DIAN aun esta procesando y
# cuyo webhook podria llegar en cualquier momento.
ANTIGUEDAD_MINIMA = timedelta(minutes=10)


@dataclass
class ResultadoReconciliacion:
    revisadas: int = 0
    aceptadas: int = 0
    rechazadas: int = 0
    sin_resolver: int = 0
    errores: list[tuple[uuid.UUID, str]] = field(default_factory=list)


def listar_facturas_enviadas(
    db: Session, empresa_id: uuid.UUID | None = None, antiguedad: timedelta = ANTIGUEDAD_MINIMA
) -> list[Factura]:
    limite = datetime.now(timezone.utc) - antiguedad
    query = (
        select(Factura)
        .where(
            Factura.estado == "enviada",
            Factura.alegra_invoice_id.is_not(None),
            Factura.eliminado.is_(None),
            Factura.fecha_envio <= limite,
        )
        .options(selectinload(Factura.cliente))
        .order_by(Factura.fecha_envio)
    )
    if empresa_id:
        query = query.where(Factura.empresa_id == empresa_id)
    return list(db.execute(query).scalars().all())


def reconciliar_facturas_enviadas(
    db: Session,
    alegra_client: AlegraClient | None = None,
    *,
    empresa_id: uuid.UUID | None = None,
    antiguedad: timedelta = ANTIGUEDAD_MINIMA,
    notificar_clientes: bool = True,
) -> ResultadoReconciliacion:
    """`notificar_clientes=False` sirve para un backfill de facturas viejas
    en el que no se quiere mandarle al cliente final un correo dias despues
    de la venta -- la revision de la alerta de cuota del tenant se hace
    igual en ambos casos."""
    alegra_client = alegra_client or AlegraClient()
    resultado = ResultadoReconciliacion()
    empresas_con_aceptadas: set[uuid.UUID] = set()

    for factura in listar_facturas_enviadas(db, empresa_id, antiguedad):
        resultado.revisadas += 1
        try:
            respuesta = alegra_client.get_invoice(factura.alegra_invoice_id)
        except (AlegraApiError, AlegraTransientError) as exc:
            resultado.errores.append((factura.id, str(exc)))
            logger.error("No se pudo consultar en Alegra la factura %s: %s", factura.id, exc)
            continue

        if not aplicar_estado_legal(factura, respuesta.get("invoice") or {}):
            resultado.sin_resolver += 1
            continue

        db.add(factura)
        db.commit()
        if factura.estado == "aceptada":
            resultado.aceptadas += 1
            empresas_con_aceptadas.add(factura.empresa_id)
            if notificar_clientes:
                notificar_factura_aceptada(db, factura, alegra_client)
        else:
            resultado.rechazadas += 1

    # notificar_factura_aceptada ya la revisa por cada factura, pero se repite
    # aqui para cubrir el caso sin notificacion -- es idempotente
    # (alerta_cuota_enviada).
    for empresa_con_aceptadas in empresas_con_aceptadas:
        revisar_alerta_cuota_sin_romper(db, empresa_con_aceptadas)

    return resultado
