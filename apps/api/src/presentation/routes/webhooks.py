import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.factura_service import notificar_factura_aceptada
from src.application.nota_credito_service import NotaCreditoService
from src.core.alegra_errors import map_government_response
from src.infrastructure.db.models import CompanyStatus, Empresa, Factura, NotaCredito, NotaDebito
from src.infrastructure.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks/alegra", tags=["webhooks"])


@router.post("/general", status_code=204)
async def webhook_general(request: Request, db: Session = Depends(get_db)):
    """
    Webhook general.governmentStatusChanged.

    Alegra no documenta un ejemplo de payload para este evento especifico (ver
    apps/api/docs/alegra-investigacion.md) ni firma/HMAC para verificarlo, asi que
    el parseo es best-effort: se guarda el payload crudo completo siempre (nada se
    pierde aunque el parseo de mas abajo no aplique), y solo se actualiza el estado
    de la empresa si se puede identificar con certeza via su id_alegra.
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


@router.post("/invoices", status_code=204)
async def webhook_invoices(request: Request, db: Session = Depends(get_db)):
    """
    Webhook invoices.emissionFinished.

    Alegra no documenta firma/HMAC para verificar la autenticidad de la
    llamada (ver docs/alegra-investigacion.md) -- no se confia en el
    contenido sin validar contra el estado que ya tenemos guardado:
    (1) el invoice.id debe corresponder a una factura conocida via
    alegra_invoice_id, y (2) si esa factura ya quedo en un estado final
    (aceptada/rechazada, normalmente resuelto ya en la respuesta sincrona de
    `FacturaService.enviar`), este webhook no la sobreescribe -- solo sirve
    de reconciliacion para el caso en que Alegra tarde en resolver.
    """
    payload = await request.json()
    logger.info("Webhook Alegra invoices.emissionFinished recibido: %s", payload)

    invoice = payload.get("invoice") or {}
    invoice_id = invoice.get("id")
    if not invoice_id:
        logger.warning("Webhook invoices sin invoice.id identificable, se descarta.")
        return

    factura = db.execute(select(Factura).where(Factura.alegra_invoice_id == invoice_id)).scalar_one_or_none()
    if factura is None:
        logger.warning("Webhook invoices para invoice.id=%s no corresponde a ninguna factura conocida.", invoice_id)
        return

    if factura.estado in ("aceptada", "rechazada"):
        logger.info("Factura %s ya esta en estado final (%s), webhook ignorado.", factura.id, factura.estado)
        return

    government_response = invoice.get("governmentResponse") or {}
    legal_status = invoice.get("legalStatus")
    if legal_status in ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS"):
        factura.estado = "aceptada"
        factura.cufe = invoice.get("cufe") or factura.cufe
        factura.razon_rechazo = None
        factura.notificaciones_dian = government_response.get("errorMessages") or None
        factura.fecha_respuesta = datetime.now(timezone.utc)
    elif legal_status == "REJECTED":
        factura.estado = "rechazada"
        factura.razon_rechazo = map_government_response(
            government_response.get("code", ""), government_response.get("message") or "La DIAN rechazo la factura."
        )
        factura.notificaciones_dian = government_response.get("errorMessages") or None
        factura.fecha_respuesta = datetime.now(timezone.utc)
    else:
        logger.info("Webhook invoices con legalStatus=%s, sin cambio de estado para factura %s.", legal_status, factura.id)
        return

    db.add(factura)
    db.commit()
    notificar_factura_aceptada(db, factura)


@router.post("/credit-notes", status_code=204)
async def webhook_credit_notes(request: Request, db: Session = Depends(get_db)):
    """
    Webhook creditNotes.emissionFinished -- mismo criterio que
    webhook_invoices (Sprint 8): la respuesta sincrona de
    `NotaCreditoService.enviar` ya resuelve el estado en la mayoria de los
    casos, este webhook solo reconcilia si Alegra tarda en resolver. No
    sobreescribe una nota ya en estado final (aceptada/rechazada).
    """
    payload = await request.json()
    logger.info("Webhook Alegra creditNotes.emissionFinished recibido: %s", payload)

    credit_note = payload.get("creditNote") or {}
    credit_note_id = credit_note.get("id")
    if not credit_note_id:
        logger.warning("Webhook credit-notes sin creditNote.id identificable, se descarta.")
        return

    nota = db.execute(
        select(NotaCredito)
        .where(NotaCredito.alegra_credit_note_id == credit_note_id)
        .options(selectinload(NotaCredito.factura).selectinload(Factura.lineas))
    ).scalar_one_or_none()
    if nota is None:
        logger.warning(
            "Webhook credit-notes para creditNote.id=%s no corresponde a ninguna nota conocida.", credit_note_id
        )
        return

    if nota.estado in ("aceptada", "rechazada"):
        logger.info("Nota credito %s ya esta en estado final (%s), webhook ignorado.", nota.id, nota.estado)
        return

    government_response = credit_note.get("governmentResponse") or {}
    legal_status = credit_note.get("legalStatus")
    if legal_status in ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS"):
        nota.estado = "aceptada"
        nota.cude = credit_note.get("cude") or nota.cude
        nota.razon_rechazo = None
        nota.notificaciones_dian = government_response.get("errorMessages") or None
        nota.fecha_respuesta = datetime.now(timezone.utc)
        db.add(nota)
        # flush (sin commit) para que revisar_anulacion -- que consulta
        # NotaCredito.estado por SQL -- vea el "aceptada" recien asignado a
        # esta misma nota (mismo hallazgo ya resuelto en NotaCreditoService.enviar).
        db.flush()
        NotaCreditoService(db).revisar_anulacion(nota.factura)
        db.add(nota.factura)
    elif legal_status == "REJECTED":
        nota.estado = "rechazada"
        nota.razon_rechazo = map_government_response(
            government_response.get("code", ""), government_response.get("message") or "La DIAN rechazo la nota."
        )
        nota.notificaciones_dian = government_response.get("errorMessages") or None
        nota.fecha_respuesta = datetime.now(timezone.utc)
    else:
        logger.info("Webhook credit-notes con legalStatus=%s, sin cambio de estado para nota %s.", legal_status, nota.id)
        return

    db.add(nota)
    db.commit()


@router.post("/debit-notes", status_code=204)
async def webhook_debit_notes(request: Request, db: Session = Depends(get_db)):
    """
    Webhook debitNotes.emissionFinished -- mismo criterio que
    webhook_credit_notes, sin la reconciliacion de anulacion de factura (una
    nota debito no reduce nada de la factura original).
    """
    payload = await request.json()
    logger.info("Webhook Alegra debitNotes.emissionFinished recibido: %s", payload)

    debit_note = payload.get("debitNote") or {}
    debit_note_id = debit_note.get("id")
    if not debit_note_id:
        logger.warning("Webhook debit-notes sin debitNote.id identificable, se descarta.")
        return

    nota = db.execute(
        select(NotaDebito).where(NotaDebito.alegra_debit_note_id == debit_note_id)
    ).scalar_one_or_none()
    if nota is None:
        logger.warning(
            "Webhook debit-notes para debitNote.id=%s no corresponde a ninguna nota conocida.", debit_note_id
        )
        return

    if nota.estado in ("aceptada", "rechazada"):
        logger.info("Nota debito %s ya esta en estado final (%s), webhook ignorado.", nota.id, nota.estado)
        return

    government_response = debit_note.get("governmentResponse") or {}
    legal_status = debit_note.get("legalStatus")
    if legal_status in ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS"):
        nota.estado = "aceptada"
        nota.cude = debit_note.get("cude") or nota.cude
        nota.razon_rechazo = None
        nota.notificaciones_dian = government_response.get("errorMessages") or None
        nota.fecha_respuesta = datetime.now(timezone.utc)
    elif legal_status == "REJECTED":
        nota.estado = "rechazada"
        nota.razon_rechazo = map_government_response(
            government_response.get("code", ""), government_response.get("message") or "La DIAN rechazo la nota."
        )
        nota.notificaciones_dian = government_response.get("errorMessages") or None
        nota.fecha_respuesta = datetime.now(timezone.utc)
    else:
        logger.info("Webhook debit-notes con legalStatus=%s, sin cambio de estado para nota %s.", legal_status, nota.id)
        return

    db.add(nota)
    db.commit()
