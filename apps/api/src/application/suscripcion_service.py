import logging
from datetime import datetime, time

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.email_client import EmailClient, EmailSendError
from src.core.email_templates import plantilla_alerta_cuota
from src.core.tiempo import ZONA_HORARIA_COLOMBIA
from src.infrastructure.db.models import (
    DocumentoSoporte,
    Empresa,
    EventoReceptor,
    Factura,
    FacturaRecibida,
    Nomina,
    NotaCredito,
    NotaDebito,
    Suscripcion,
    UsuarioEmpresa,
)

logger = logging.getLogger(__name__)

UMBRAL_ALERTA_CUOTA = 0.9

# legal_status que devuelve la DIAN (via Alegra) para un evento valido.
ESTADOS_EVENTO_ACEPTADO = ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS")


def contar_documentos_usados(db: Session, suscripcion: Suscripcion) -> int:
    """Cuenta Facturas + Notas Credito + Notas Debito + Documentos Soporte +
    comprobantes de Nomina + eventos del receptor (RADIAN) aceptados por la
    DIAN dentro del periodo de la suscripcion (todo lo que se transmite a la
    DIAN consume cupo, decision de negocio del 2026-09-24 -- la landing lo
    publica asi) -- reemplaza la lectura de
    Suscripcion.documentos_usados, que nunca se incrementa en ningun lado
    del codigo (columna legacy, ver el modelo). Una Factura 'anulada' sigue
    contando: el documento si se emitio y consumio un cupo, la Nota Credito
    que la anulo es un documento aparte que tambien cuenta.

    fecha_inicio/fecha_fin son fechas de calendario en Colombia (las fija
    el admin en /admin/companies), no UTC -- anclarlas a medianoche/fin de
    dia UTC directamente corta las ultimas ~5 horas del ultimo dia del
    periodo (hallazgo real: un documento enviado entre las 7pm y la
    medianoche hora Colombia del dia de fecha_fin quedaba fuera del
    conteo). Se combinan en America/Bogota; la comparacion contra
    fecha_envio (datetime aware en UTC) es correcta sin importar la zona."""
    inicio = datetime.combine(suscripcion.fecha_inicio, time.min, tzinfo=ZONA_HORARIA_COLOMBIA)
    fin = datetime.combine(suscripcion.fecha_fin, time.max, tzinfo=ZONA_HORARIA_COLOMBIA)

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

    # Nomina anulada cuenta igual que Factura anulada (el comprobante si se
    # emitio). Documento Soporte usa el estado en masculino ("aceptado").
    estados_por_modelo = (
        (NotaCredito, ("aceptada",)),
        (NotaDebito, ("aceptada",)),
        (DocumentoSoporte, ("aceptado",)),
        (Nomina, ("aceptada", "anulada")),
    )
    for modelo, estados in estados_por_modelo:
        total += db.execute(
            select(func.count())
            .select_from(modelo)
            .where(
                modelo.empresa_id == suscripcion.empresa_id,
                modelo.estado.in_(estados),
                modelo.fecha_envio >= inicio,
                modelo.fecha_envio <= fin,
            )
        ).scalar_one()

    # La anulacion de una nomina (nota de eliminacion) es un documento aparte
    # ante la DIAN y descuenta el suyo, ademas del comprobante original.
    total += db.execute(
        select(func.count())
        .select_from(Nomina)
        .where(
            Nomina.empresa_id == suscripcion.empresa_id,
            Nomina.estado == "anulada",
            Nomina.fecha_anulacion >= inicio,
            Nomina.fecha_anulacion <= fin,
        )
    ).scalar_one()

    # Los eventos no tienen empresa_id ni fecha_envio propios: cuelgan de la
    # FacturaRecibida y se registran (y responde la DIAN) al crearse.
    total += db.execute(
        select(func.count())
        .select_from(EventoReceptor)
        .join(FacturaRecibida, EventoReceptor.factura_recibida_id == FacturaRecibida.id)
        .where(
            FacturaRecibida.empresa_id == suscripcion.empresa_id,
            EventoReceptor.legal_status.in_(ESTADOS_EVENTO_ACEPTADO),
            EventoReceptor.creado >= inicio,
            EventoReceptor.creado <= fin,
        )
    ).scalar_one()

    return total


def verificar_cupo_disponible(db: Session, empresa_id) -> None:
    """Bloquea CUALQUIER transmision a la DIAN (facturas, notas credito y
    debito, anulaciones, documentos soporte, nomina y su anulacion, eventos
    del receptor) si la empresa no tiene suscripcion activa o ya agoto su
    cupo. Decision de negocio del 2026-09-24: sin documentos disponibles no
    se envia nada a la DIAN."""
    suscripcion = db.execute(
        select(Suscripcion).where(Suscripcion.empresa_id == empresa_id, Suscripcion.estado == "activa")
    ).scalar_one_or_none()
    if suscripcion is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta empresa no tiene una suscripcion activa.")
    if contar_documentos_usados(db, suscripcion) >= suscripcion.max_documentos:
        raise HTTPException(status.HTTP_409_CONFLICT, "Se agoto el cupo de documentos del plan actual.")


def revisar_alerta_cuota_por_empresa(
    db: Session, empresa_id, email_client: EmailClient | None = None
) -> None:
    """Best-effort: revisa si la suscripcion activa de la empresa cruzo el
    90% de su cupo y, si es la primera vez, avisa por correo. Se llama
    desde los mismos puntos que notifican la aceptacion de un documento
    (Factura/NotaCredito/NotaDebito/DocumentoSoporte/Nomina/eventos del
    receptor) -- nunca debe
    romper ese flujo."""
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


def revisar_alerta_cuota_sin_romper(db: Session, empresa_id) -> None:
    """Igual que revisar_alerta_cuota_por_empresa pero tragando cualquier
    error: el documento ya quedo aceptado ante la DIAN, un fallo al revisar
    la cuota no debe convertirse en un error para el usuario."""
    try:
        revisar_alerta_cuota_por_empresa(db, empresa_id)
    except Exception as exc:  # noqa: BLE001 -- best-effort, ver docstring.
        logger.error("No se pudo revisar la cuota de documentos de la empresa %s: %s", empresa_id, exc)
