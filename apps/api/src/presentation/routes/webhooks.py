import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.application.habilitacion_dian_service import HabilitacionDianService
from src.application.reconciliacion_documentos import (
    buscar_por_id_alegra,
    extraer_documento,
    reconciliar_documento,
    tipo_por_nombre,
)
from src.application.suscripcion_service import revisar_alerta_cuota_sin_romper
from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_webhooks import HEADER_TOKEN, token_valido
from src.infrastructure.db.models import CompanyStatus, Empresa
from src.infrastructure.db.session import get_db

logger = logging.getLogger(__name__)


def verificar_token_webhook(request: Request) -> None:
    """Alegra no firma los webhooks: la autenticacion es el header secreto
    que registramos junto con cada webhook (ver core/alegra_webhooks.py)."""
    if not token_valido(request.headers.get(HEADER_TOKEN)):
        logger.warning("Webhook Alegra rechazado: %s ausente o invalido.", HEADER_TOKEN)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Webhook no autorizado.")


def get_alegra_client() -> AlegraClient:
    return AlegraClient()


router = APIRouter(
    prefix="/api/v1/webhooks/alegra", tags=["webhooks"], dependencies=[Depends(verificar_token_webhook)]
)


@router.post("/general", status_code=204)
async def webhook_general(request: Request, db: Session = Depends(get_db)):
    """
    Webhook general.governmentStatusChanged.

    Alegra no documenta un ejemplo de payload para este evento especifico (ver
    apps/api/docs/alegra-investigacion.md), asi que el parseo es best-effort: se
    guarda el payload crudo completo siempre (nada se pierde aunque el parseo de
    mas abajo no aplique), y solo se actualiza el estado de la empresa si se
    puede identificar con certeza via su id_alegra.
    """
    payload = await request.json()
    logger.info("Webhook Alegra general recibido: %s", payload)

    company = payload.get("company") or {}
    id_alegra = company.get("id") or payload.get("id")

    if not id_alegra:
        logger.warning("Webhook general sin id de compania identificable, se descarta.")
        return

    empresa = db.query(Empresa).filter(Empresa.id_alegra == id_alegra).one_or_none()
    if empresa is None:
        logger.warning("Webhook general para id_alegra=%s no corresponde a ninguna empresa conocida.", id_alegra)
        return

    db.add(CompanyStatus(empresa_id=empresa.id, estado="government_status_changed", detalle=payload))
    db.commit()

    # El payload no esta documentado: en vez de parsearlo, se relee el
    # governmentStatus real de la empresa para refrescar la cache.
    try:
        HabilitacionDianService(db).sincronizar(empresa.id)
    except (AlegraApiError, AlegraTransientError) as exc:
        db.rollback()
        logger.warning("No se pudo refrescar la habilitacion DIAN de %s tras el webhook: %s", empresa.id, exc)


def _procesar_emission_finished(db: Session, alegra_client: AlegraClient, nombre_tipo: str, payload: dict) -> None:
    """emissionFinished de cualquier tipo de documento. Del payload solo se
    toma el id: el estado real se re-consulta a Alegra
    (reconciliar_documento), asi que un POST falso no puede cambiar nada.
    Nunca responde error por el documento en si -- un 4xx/5xx haria que
    Alegra reintente (si es que reintenta, no esta documentado) algo que ya
    cubre la reconciliacion periodica del cron."""
    tipo = tipo_por_nombre(nombre_tipo)
    logger.info("Webhook Alegra %s.emissionFinished recibido: %s", nombre_tipo, payload)

    id_alegra = extraer_documento(tipo, payload).get("id") or payload.get("id")
    if not id_alegra:
        logger.warning("Webhook %s sin id de documento identificable, se descarta.", nombre_tipo)
        return

    documento = buscar_por_id_alegra(db, tipo, id_alegra)
    if documento is None:
        logger.warning("Webhook %s para id=%s no corresponde a ningun documento conocido.", nombre_tipo, id_alegra)
        return
    if documento.estado != tipo.estado_pendiente:
        logger.info("%s %s ya esta en estado %s, webhook ignorado.", nombre_tipo, documento.id, documento.estado)
        return

    try:
        desenlace = reconciliar_documento(db, alegra_client, tipo, documento, notificar_clientes=True)
    except (AlegraApiError, AlegraTransientError) as exc:
        db.rollback()
        logger.error("Webhook %s: no se pudo consultar %s en Alegra: %s", nombre_tipo, documento.id, exc)
        return

    logger.info("Webhook %s: documento %s -> %s.", nombre_tipo, documento.id, desenlace)
    if desenlace == "aceptado":
        revisar_alerta_cuota_sin_romper(db, documento.empresa_id)


@router.post("/invoices", status_code=204)
async def webhook_invoices(
    request: Request, db: Session = Depends(get_db), alegra_client: AlegraClient = Depends(get_alegra_client)
):
    _procesar_emission_finished(db, alegra_client, "facturas", await request.json())


@router.post("/credit-notes", status_code=204)
async def webhook_credit_notes(
    request: Request, db: Session = Depends(get_db), alegra_client: AlegraClient = Depends(get_alegra_client)
):
    _procesar_emission_finished(db, alegra_client, "notas_credito", await request.json())


@router.post("/debit-notes", status_code=204)
async def webhook_debit_notes(
    request: Request, db: Session = Depends(get_db), alegra_client: AlegraClient = Depends(get_alegra_client)
):
    _procesar_emission_finished(db, alegra_client, "notas_debito", await request.json())


@router.post("/payrolls", status_code=204)
async def webhook_payrolls(
    request: Request, db: Session = Depends(get_db), alegra_client: AlegraClient = Depends(get_alegra_client)
):
    _procesar_emission_finished(db, alegra_client, "nominas", await request.json())


@router.post("/support-documents", status_code=204)
async def webhook_support_documents(
    request: Request, db: Session = Depends(get_db), alegra_client: AlegraClient = Depends(get_alegra_client)
):
    _procesar_emission_finished(db, alegra_client, "documentos_soporte", await request.json())
