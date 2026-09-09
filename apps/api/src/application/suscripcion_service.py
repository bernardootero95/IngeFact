import logging
from datetime import datetime, time, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.email_client import EmailClient, EmailSendError
from src.core.email_templates import plantilla_alerta_cuota
from src.infrastructure.db.models import Empresa, Factura, NotaCredito, NotaDebito, Suscripcion, UsuarioEmpresa

logger = logging.getLogger(__name__)

UMBRAL_ALERTA_CUOTA = 0.9


def contar_documentos_usados(db: Session, suscripcion: Suscripcion) -> int:
    """Cuenta Facturas + Notas Credito + Notas Debito aceptadas por la DIAN
    dentro del periodo de la suscripcion -- reemplaza la lectura de
    Suscripcion.documentos_usados, que nunca se incrementa en ningun lado
    del codigo (columna legacy, ver el modelo). Una Factura 'anulada' sigue
    contando: el documento si se emitio y consumio un cupo, la Nota Credito
    que la anulo es un documento aparte que tambien cuenta."""
    inicio = datetime.combine(suscripcion.fecha_inicio, time.min, tzinfo=timezone.utc)
    fin = datetime.combine(suscripcion.fecha_fin, time.max, tzinfo=timezone.utc)

    total = db.execute(
        select(func.count())
        .select_from(Factura)
        .where(
            Factura.empresa_id == suscripcion.empresa_id,
            Factura.estado.in_(("aceptada", "anulada")),
            Factura.fecha_envio >= inicio,
            Factura.fecha_envio <= fin,
        )
    ).scalar_one()

    for modelo in (NotaCredito, NotaDebito):
        total += db.execute(
            select(func.count())
            .select_from(modelo)
            .where(
                modelo.empresa_id == suscripcion.empresa_id,
                modelo.estado == "aceptada",
                modelo.fecha_envio >= inicio,
                modelo.fecha_envio <= fin,
            )
        ).scalar_one()

    return total


def revisar_alerta_cuota_por_empresa(
    db: Session, empresa_id, email_client: EmailClient | None = None
) -> None:
    """Best-effort: revisa si la suscripcion activa de la empresa cruzo el
    90% de su cupo y, si es la primera vez, avisa por correo. Se llama
    desde los mismos puntos que notifican la aceptacion de un documento
    (Factura/NotaCredito/NotaDebito) -- nunca debe romper ese flujo."""
    suscripcion = db.execute(
        select(Suscripcion).where(Suscripcion.empresa_id == empresa_id, Suscripcion.estado == "activa")
    ).scalar_one_or_none()
    if suscripcion is None or suscripcion.alerta_cuota_enviada:
        return

    usados = contar_documentos_usados(db, suscripcion)
    if usados < UMBRAL_ALERTA_CUOTA * suscripcion.max_documentos:
        return

    empresa = db.get(Empresa, empresa_id)
    usuario = db.execute(
        select(UsuarioEmpresa).where(UsuarioEmpresa.empresa_id == empresa_id)
    ).scalars().first()
    destinatario = usuario.email if usuario else empresa.correo_electronico
    if not destinatario:
        return

    subject, html = plantilla_alerta_cuota(empresa.razon_social, usados, suscripcion.max_documentos)
    try:
        (email_client or EmailClient()).send(to=destinatario, subject=subject, html=html)
    except EmailSendError as exc:
        # No se marca alerta_cuota_enviada -- se reintenta con el proximo
        # documento aceptado en vez de perder el aviso para siempre.
        logger.error("No se pudo enviar el aviso de cuota a %s: %s", destinatario, exc)
        return

    suscripcion.alerta_cuota_enviada = True
    db.add(suscripcion)
    db.commit()
