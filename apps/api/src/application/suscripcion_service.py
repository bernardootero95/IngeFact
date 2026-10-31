import logging
from datetime import datetime, time

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.email_client import EmailClient, EmailSendError
from src.core.email_templates import plantilla_alerta_cuota
from src.core.tiempo import ZONA_HORARIA_COLOMBIA, hoy_colombia
from src.domain.factura_recibida import ESTADOS_EVENTO_ACEPTADO, ORIGEN_INGEFACT
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


def contar_documentos_usados(db: Session, suscripcion: Suscripcion, hasta: datetime | None = None) -> int:
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
    if hasta is not None:
        # Corte opcional: documentos usados hasta un instante (ej. al 1ro de
        # mes, para saber el cupo con el que arranco el mes).
        fin = min(fin, hasta)
    return contar_documentos_aceptados(db, inicio, fin, empresa_id=suscripcion.empresa_id)


def contar_documentos_aceptados(db: Session, inicio: datetime, fin: datetime, empresa_id=None) -> int:
    """Documentos que se le cobran al tenant entre `inicio` y `fin` (ver
    contar_documentos_usados para que cuenta y por que). Sin `empresa_id`
    cuenta los de toda la plataforma. Los eventos del receptor se cobran por
    factura recibida, no por evento (decision de negocio 2026-10-31); lo que
    cobra Alegra va en contar_documentos_alegra."""
    return _contar_sin_eventos(db, inicio, fin, empresa_id) + _contar_facturas_recibidas_cobradas(
        db, inicio, fin, empresa_id
    )


def contar_documentos_alegra(db: Session, inicio: datetime, fin: datetime) -> int:
    """Documentos de toda la plataforma que Alegra le factura a IngeFact
    entre `inicio` y `fin`: los mismos del cobro al tenant, salvo que Alegra
    cuenta CADA evento del receptor aceptado. Base del costo de Alegra."""
    eventos = db.execute(
        select(func.count())
        .select_from(EventoReceptor)
        .where(*_eventos_cobrables(), EventoReceptor.creado >= inicio, EventoReceptor.creado <= fin)
    ).scalar_one()
    return _contar_sin_eventos(db, inicio, fin) + eventos


def _filtro_empresa(columna, empresa_id) -> tuple:
    return (columna == empresa_id,) if empresa_id is not None else ()


def _eventos_cobrables() -> tuple:
    # Los leidos de la DIAN (origen "dian") no los transmitio IngeFact: no cuentan.
    return (
        EventoReceptor.origen == ORIGEN_INGEFACT,
        EventoReceptor.legal_status.in_(ESTADOS_EVENTO_ACEPTADO),
    )


def _contar_sin_eventos(db: Session, inicio: datetime, fin: datetime, empresa_id=None) -> int:
    """Facturas, notas, documentos soporte y nomina: uno por documento."""
    total = db.execute(
        select(func.count())
        .select_from(Factura)
        .where(
            *_filtro_empresa(Factura.empresa_id, empresa_id),
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
                *_filtro_empresa(modelo.empresa_id, empresa_id),
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
            *_filtro_empresa(Nomina.empresa_id, empresa_id),
            Nomina.estado == "anulada",
            Nomina.fecha_anulacion >= inicio,
            Nomina.fecha_anulacion <= fin,
        )
    ).scalar_one()
    return total


def _contar_facturas_recibidas_cobradas(db: Session, inicio: datetime, fin: datetime, empresa_id=None) -> int:
    """Facturas recibidas cuyo PRIMER evento aceptado de IngeFact cae entre
    `inicio` y `fin`: cada una se cobra una sola vez en toda su vida (ver
    factura_recibida_cobrada). Los eventos no tienen empresa_id propio:
    cuelgan de la FacturaRecibida."""
    primer_evento = (
        select(EventoReceptor.factura_recibida_id, func.min(EventoReceptor.creado).label("creado"))
        .where(*_eventos_cobrables())
        .group_by(EventoReceptor.factura_recibida_id)
        .subquery()
    )
    return db.execute(
        select(func.count())
        .select_from(primer_evento)
        .join(FacturaRecibida, primer_evento.c.factura_recibida_id == FacturaRecibida.id)
        .where(
            *_filtro_empresa(FacturaRecibida.empresa_id, empresa_id),
            primer_evento.c.creado >= inicio,
            primer_evento.c.creado <= fin,
        )
    ).scalar_one()


MENSAJE_SIN_SUSCRIPCION = "Esta empresa no tiene una suscripcion activa."


def _suscripcion_activa(db: Session, empresa_id) -> Suscripcion | None:
    return db.execute(
        select(Suscripcion).where(Suscripcion.empresa_id == empresa_id, Suscripcion.estado == "activa")
    ).scalar_one_or_none()


def motivo_plan_no_vigente(db: Session, empresa_id) -> str | None:
    """None si la empresa tiene una suscripcion activa y sin vencer; si no,
    el motivo. Un plan vencido bloquea todo envio a la DIAN aunque el
    documento no descuente cupo (decision de negocio 2026-10-31): antes,
    pasada fecha_fin, el conteo dejaba de sumar y el plan nunca se agotaba."""
    suscripcion = _suscripcion_activa(db, empresa_id)
    if suscripcion is None:
        return MENSAJE_SIN_SUSCRIPCION
    if suscripcion.fecha_fin < hoy_colombia():
        return (
            f"Tu plan venció el {suscripcion.fecha_fin:%d/%m/%Y}. "
            "Renuévalo para seguir enviando documentos a la DIAN."
        )
    return None


def verificar_plan_vigente(db: Session, empresa_id) -> None:
    """Para envios que no descuentan cupo (eventos sobre una factura
    recibida ya cobrada): solo exige el plan vigente."""
    motivo = motivo_plan_no_vigente(db, empresa_id)
    if motivo:
        raise HTTPException(status.HTTP_409_CONFLICT, motivo)


def verificar_cupo_disponible(db: Session, empresa_id) -> None:
    """Bloquea CUALQUIER transmision a la DIAN (facturas, notas credito y
    debito, anulaciones, documentos soporte, nomina y su anulacion, eventos
    del receptor) si la empresa no tiene un plan vigente o ya agoto su
    cupo. Decision de negocio del 2026-09-24: sin documentos disponibles no
    se envia nada a la DIAN."""
    verificar_plan_vigente(db, empresa_id)
    if documentos_disponibles(db, empresa_id) == 0:
        raise HTTPException(status.HTTP_409_CONFLICT, "Se agoto el cupo de documentos del plan actual.")


def documentos_disponibles(db: Session, empresa_id) -> int | None:
    """Documentos que le quedan a la suscripcion activa; None si no hay una."""
    suscripcion = _suscripcion_activa(db, empresa_id)
    if suscripcion is None:
        return None
    return max(suscripcion.max_documentos - contar_documentos_usados(db, suscripcion), 0)


def mensaje_cupo_insuficiente(disponibles: int | None, necesarios: int) -> str | None:
    """None si el cupo alcanza para `necesarios` envios; si no, el motivo."""
    if disponibles is None:
        return MENSAJE_SIN_SUSCRIPCION
    if necesarios > disponibles:
        return f"No tienes documentos suficientes: necesitas {necesarios} y tienes {disponibles} disponibles."
    return None


def verificar_cupo_para(db: Session, empresa_id, cantidad: int) -> None:
    """Como verificar_cupo_disponible, pero para un lote: exige plan vigente
    y cupo para los `cantidad` envios que descuentan antes de transmitir el
    primero (con `cantidad` 0 solo exige el plan vigente)."""
    verificar_plan_vigente(db, empresa_id)
    motivo = mensaje_cupo_insuficiente(documentos_disponibles(db, empresa_id), cantidad)
    if motivo:
        raise HTTPException(status.HTTP_409_CONFLICT, motivo)


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
