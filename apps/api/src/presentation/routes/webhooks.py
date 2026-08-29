import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.infrastructure.db.models import CompanyStatus, Empresa
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
async def webhook_invoices(request: Request):
    """
    Webhook invoices.emissionFinished.

    Sin tabla `facturas` todavia (Sprint 8), este endpoint solo recibe y loguea --
    la actualizacion real de una factura (status/legalStatus/cufe) queda pendiente
    para cuando exista el modelo de Factura.
    """
    payload = await request.json()
    logger.info("Webhook Alegra invoices.emissionFinished recibido (sin procesar, ver Sprint 8): %s", payload)
