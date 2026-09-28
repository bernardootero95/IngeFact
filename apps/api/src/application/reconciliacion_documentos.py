"""Reconciliacion de documentos que quedaron en 'enviada' ('enviado' en
Documento Soporte).

Hallazgo real en produccion (2026-09-28): 179 facturas de un tenant que
factura por API quedaron en 'enviada' -- todas del 2026-09-23 entre las
02:17 y las 11:54 UTC. Alegra respondio el POST sin legalStatus final (la
DIAN no alcanzo a resolver en la respuesta sincrona) y los webhooks
emissionFinished nunca llegaron (0 recibidos en los logs), asi que nada las
movia de estado: no descontaban cupo (contar_documentos_usados solo cuenta
aceptados) pero si aparecian en el KPI de actividad del admin (cuenta todo
lo que no es 'borrador'). Nota Credito, Nota Debito, Nomina y Documento
Soporte tienen exactamente el mismo punto ciego.

Esto re-consulta cada uno a Alegra (GET /<recurso>/{id}) y le aplica el
legalStatus real con la misma regla que enviar() y los webhooks
(estado_legal.py). Es idempotente: solo toca documentos pendientes, y uno
que Alegra siga sin resolver se deja igual para el siguiente intento.
"""

import logging
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.application.documento_soporte_service import (
    aplicar_estado_legal_documento_soporte,
    notificar_documento_soporte_aceptado,
)
from src.application.factura_service import aplicar_estado_legal_factura, notificar_factura_aceptada
from src.application.nomina_service import aplicar_estado_legal_nomina
from src.application.nota_credito_service import NotaCreditoService, aplicar_estado_legal_nota_credito
from src.application.nota_debito_service import aplicar_estado_legal_nota_debito
from src.application.suscripcion_service import revisar_alerta_cuota_sin_romper
from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.infrastructure.db.models import DocumentoSoporte, Factura, Nomina, NotaCredito, NotaDebito

logger = logging.getLogger(__name__)

# Margen para no competir con un envio que la DIAN aun esta procesando y
# cuyo webhook podria llegar en cualquier momento.
ANTIGUEDAD_MINIMA = timedelta(minutes=10)

ESTADOS_ACEPTADO = ("aceptada", "aceptado")


def _revisar_anulacion_factura(db: Session, nota: NotaCredito) -> None:
    """Una Nota Credito aceptada puede dejar la factura completamente
    acreditada (= anulada), mismo paso que NotaCreditoService.enviar y el
    webhook. flush para que disponibilidad_lineas (SQL) vea esta nota ya
    aceptada."""
    db.flush()
    NotaCreditoService(db).revisar_anulacion(nota.factura)
    db.add(nota.factura)


@dataclass(frozen=True)
class TipoDocumento:
    nombre: str
    modelo: type
    campo_alegra_id: str
    estado_pendiente: str
    # Claves bajo las que Alegra envuelve el documento en la respuesta del
    # GET y en el payload del webhook emissionFinished.
    claves_respuesta: tuple[str, ...]
    consultar: Callable[[AlegraClient, str], dict]
    aplicar: Callable[[Any, dict], bool]
    # Pasos de negocio antes del commit cuando el documento queda aceptado.
    al_aceptar: Callable[[Session, Any], None] | None = None
    # Correo al destinatario final (cliente/proveedor) del documento aceptado.
    notificar: Callable[[Session, Any, AlegraClient], None] | None = None


TIPOS_DOCUMENTO: tuple[TipoDocumento, ...] = (
    TipoDocumento(
        nombre="facturas",
        modelo=Factura,
        campo_alegra_id="alegra_invoice_id",
        estado_pendiente="enviada",
        claves_respuesta=("invoice",),
        consultar=lambda alegra, id_: alegra.get_invoice(id_),
        aplicar=aplicar_estado_legal_factura,
        notificar=notificar_factura_aceptada,
    ),
    TipoDocumento(
        nombre="notas_credito",
        modelo=NotaCredito,
        campo_alegra_id="alegra_credit_note_id",
        estado_pendiente="enviada",
        claves_respuesta=("creditNote",),
        consultar=lambda alegra, id_: alegra.get_credit_note(id_),
        aplicar=aplicar_estado_legal_nota_credito,
        al_aceptar=_revisar_anulacion_factura,
    ),
    TipoDocumento(
        nombre="notas_debito",
        modelo=NotaDebito,
        campo_alegra_id="alegra_debit_note_id",
        estado_pendiente="enviada",
        claves_respuesta=("debitNote",),
        consultar=lambda alegra, id_: alegra.get_debit_note(id_),
        aplicar=aplicar_estado_legal_nota_debito,
    ),
    TipoDocumento(
        nombre="nominas",
        modelo=Nomina,
        campo_alegra_id="alegra_payroll_id",
        estado_pendiente="enviada",
        # El body real usa "payroll"; el schema OpenAPI dice "emission" (ver
        # NominaService._aplicar_respuesta_envio).
        claves_respuesta=("payroll", "emission"),
        consultar=lambda alegra, id_: alegra.get_payroll(id_),
        aplicar=aplicar_estado_legal_nomina,
    ),
    TipoDocumento(
        nombre="documentos_soporte",
        modelo=DocumentoSoporte,
        campo_alegra_id="alegra_support_document_id",
        estado_pendiente="enviado",
        claves_respuesta=("supportDocument",),
        consultar=lambda alegra, id_: alegra.get_support_document(id_),
        aplicar=aplicar_estado_legal_documento_soporte,
        notificar=notificar_documento_soporte_aceptado,
    ),
)


@dataclass
class ResultadoTipo:
    revisados: int = 0
    aceptados: int = 0
    rechazados: int = 0
    sin_resolver: int = 0
    errores: list[tuple[uuid.UUID, str]] = field(default_factory=list)


def listar_pendientes(
    db: Session,
    tipo: TipoDocumento,
    empresa_id: uuid.UUID | None = None,
    antiguedad: timedelta = ANTIGUEDAD_MINIMA,
) -> list:
    modelo = tipo.modelo
    limite = datetime.now(timezone.utc) - antiguedad
    query = (
        select(modelo)
        .where(
            modelo.estado == tipo.estado_pendiente,
            getattr(modelo, tipo.campo_alegra_id).is_not(None),
            modelo.eliminado.is_(None),
            modelo.fecha_envio <= limite,
        )
        .order_by(modelo.fecha_envio)
    )
    if empresa_id:
        query = query.where(modelo.empresa_id == empresa_id)
    return list(db.execute(query).scalars().all())


def extraer_documento(tipo: TipoDocumento, respuesta: dict) -> dict:
    """El objeto del documento dentro de una respuesta de Alegra o del
    payload de un webhook (mismo envoltorio: `{"invoice": {...}}`)."""
    for clave in tipo.claves_respuesta:
        if respuesta.get(clave):
            return respuesta[clave]
    return {}


def tipo_por_nombre(nombre: str) -> TipoDocumento:
    return next(tipo for tipo in TIPOS_DOCUMENTO if tipo.nombre == nombre)


def buscar_por_id_alegra(db: Session, tipo: TipoDocumento, id_alegra: str):
    modelo = tipo.modelo
    return db.execute(
        select(modelo).where(getattr(modelo, tipo.campo_alegra_id) == id_alegra)
    ).scalar_one_or_none()


def reconciliar_documento(
    db: Session, alegra_client: AlegraClient, tipo: TipoDocumento, documento, *, notificar_clientes: bool
) -> str:
    """Re-consulta un documento pendiente a Alegra y le aplica su estado
    real. Devuelve "aceptado", "rechazado" o "sin_resolver". Deja propagar
    AlegraApiError/AlegraTransientError para que el llamador decida.

    La unica fuente de verdad es el GET a Alegra, nunca el payload de un
    webhook: los webhooks de Alegra no traen firma, asi que un POST falso a
    nuestra URL no puede marcar un documento como aceptado."""
    respuesta = tipo.consultar(alegra_client, getattr(documento, tipo.campo_alegra_id))
    if not tipo.aplicar(documento, extraer_documento(tipo, respuesta)):
        return "sin_resolver"

    aceptado = documento.estado in ESTADOS_ACEPTADO
    db.add(documento)
    if aceptado and tipo.al_aceptar:
        tipo.al_aceptar(db, documento)
    db.commit()

    if not aceptado:
        return "rechazado"
    if notificar_clientes and tipo.notificar:
        tipo.notificar(db, documento, alegra_client)
    return "aceptado"


def reconciliar_tipo(
    db: Session,
    alegra_client: AlegraClient,
    tipo: TipoDocumento,
    *,
    empresa_id: uuid.UUID | None = None,
    antiguedad: timedelta = ANTIGUEDAD_MINIMA,
    notificar_clientes: bool = True,
    empresas_con_aceptados: set[uuid.UUID] | None = None,
) -> ResultadoTipo:
    resultado = ResultadoTipo()
    for documento in listar_pendientes(db, tipo, empresa_id, antiguedad):
        resultado.revisados += 1
        try:
            desenlace = reconciliar_documento(
                db, alegra_client, tipo, documento, notificar_clientes=notificar_clientes
            )
        except (AlegraApiError, AlegraTransientError) as exc:
            resultado.errores.append((documento.id, str(exc)))
            logger.error("No se pudo consultar en Alegra %s %s: %s", tipo.nombre, documento.id, exc)
            continue

        if desenlace == "sin_resolver":
            resultado.sin_resolver += 1
        elif desenlace == "rechazado":
            resultado.rechazados += 1
        else:
            resultado.aceptados += 1
            if empresas_con_aceptados is not None:
                empresas_con_aceptados.add(documento.empresa_id)
    return resultado


def reconciliar_documentos_enviados(
    db: Session,
    alegra_client: AlegraClient | None = None,
    *,
    empresa_id: uuid.UUID | None = None,
    antiguedad: timedelta = ANTIGUEDAD_MINIMA,
    notificar_clientes: bool = True,
    tipos: tuple[TipoDocumento, ...] = TIPOS_DOCUMENTO,
) -> dict[str, ResultadoTipo]:
    """`notificar_clientes=False` sirve para un backfill de documentos viejos
    en el que no se quiere mandarle al cliente/proveedor un correo dias
    despues -- la alerta de cuota del tenant se revisa igual en ambos casos."""
    alegra_client = alegra_client or AlegraClient()
    empresas_con_aceptados: set[uuid.UUID] = set()
    resultados = {
        tipo.nombre: reconciliar_tipo(
            db,
            alegra_client,
            tipo,
            empresa_id=empresa_id,
            antiguedad=antiguedad,
            notificar_clientes=notificar_clientes,
            empresas_con_aceptados=empresas_con_aceptados,
        )
        for tipo in tipos
    }
    # Idempotente (alerta_cuota_enviada): cubre tambien los tipos sin
    # notificacion propia y el caso notificar_clientes=False.
    for empresa_con_aceptados in empresas_con_aceptados:
        revisar_alerta_cuota_sin_romper(db, empresa_con_aceptados)
    return resultados
