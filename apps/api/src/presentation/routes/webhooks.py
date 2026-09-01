import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.alegra_errors import map_government_response
from src.infrastructure.db.models import CompanyStatus, Empresa, Factura
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

    legal_status = invoice.get("legalStatus")
    if legal_status == "ACCEPTED":
        factura.estado = "aceptada"
        factura.cufe = invoice.get("cufe") or factura.cufe
        factura.fecha_respuesta = datetime.now(timezone.utc)
    elif legal_status == "REJECTED":
        factura.estado = "rechazada"
        government_response = invoice.get("governmentResponse") or {}
        factura.razon_rechazo = map_government_response(
            government_response.get("code", ""), government_response.get("message") or "La DIAN rechazo la factura."
        )
        factura.fecha_respuesta = datetime.now(timezone.utc)
    else:
        logger.info("Webhook invoices con legalStatus=%s, sin cambio de estado para factura %s.", legal_status, factura.id)
        return

    db.add(factura)
    db.commit()
