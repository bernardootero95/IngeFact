"""Actividad reciente y alertas del panel del tenant (GET /tenant/dashboard/actividad)."""

import math
from datetime import date

from pydantic import BaseModel

TIPO_FACTURA = "factura"
TIPO_NOTA_CREDITO = "nota_credito"
TIPO_NOTA_DEBITO = "nota_debito"
TIPO_DOCUMENTO_SOPORTE = "documento_soporte"

ESTADO_RECHAZADA = "rechazada"
ESTADO_ENVIADA = "enviada"
ESTADO_BORRADOR = "borrador"

# El documento soporte guarda sus estados en masculino (ck_documentos_soporte_estado);
# facturas y notas, en femenino. El panel siempre responde en femenino.
_ESTADO_MASCULINO = {"enviada": "enviado", "aceptada": "aceptado", "rechazada": "rechazado"}
_ESTADO_FEMENINO = {v: k for k, v in _ESTADO_MASCULINO.items()}


def variantes_estado(estado: str) -> tuple[str, ...]:
    """Valores en BD que equivalen a `estado` en cualquier tipo de documento."""
    masculino = _ESTADO_MASCULINO.get(estado)
    return (estado, masculino) if masculino else (estado,)


def normalizar_estado(estado: str) -> str:
    return _ESTADO_FEMENINO.get(estado, estado)


LIMITE_ULTIMOS_DOCUMENTOS = 5

# Mismo criterio que el aviso del plan (30 dias) y un 10 % del rango, con un
# piso de 10 numeros para que una resolucion chica no avise demasiado tarde.
DIAS_AVISO_RESOLUCION = 30
FRACCION_AVISO_RESOLUCION = 0.1
MINIMO_AVISO_RESOLUCION = 10


class DocumentoReciente(BaseModel):
    tipo: str
    id: str
    numero: str | None
    fecha: date
    tercero: str | None
    total: float
    estado: str


class AlertaResolucion(BaseModel):
    tipo: str  # factura | documento_soporte
    prefijo: str
    restantes: int
    dias_para_vencer: int
    agotada: bool
    vencida: bool


class AlertasDocumentos(BaseModel):
    rechazados: int
    en_validacion: int
    borradores: int
    recibidas_sin_evento: int
    resoluciones: list[AlertaResolucion]


class TenantActividadResponse(BaseModel):
    ultimos_documentos: list[DocumentoReciente]
    alertas: AlertasDocumentos


def alerta_resolucion(
    tipo: str,
    prefijo: str,
    rango_minimo: int,
    rango_maximo: int,
    consecutivo_actual: int,
    fecha_fin: date,
    hoy: date,
) -> AlertaResolucion | None:
    """`consecutivo_actual` es el proximo numero a usar: la resolucion esta
    agotada cuando lo supera al rango_maximo (ver resolucion_dian_service).
    Devuelve None si todavia hay numeros y tiempo de sobra."""
    restantes = max(rango_maximo - consecutivo_actual + 1, 0)
    dias = (fecha_fin - hoy).days
    tamano = rango_maximo - rango_minimo + 1
    umbral = max(math.ceil(tamano * FRACCION_AVISO_RESOLUCION), MINIMO_AVISO_RESOLUCION)
    if restantes > umbral and dias > DIAS_AVISO_RESOLUCION:
        return None
    return AlertaResolucion(
        tipo=tipo,
        prefijo=prefijo,
        restantes=restantes,
        dias_para_vencer=dias,
        agotada=restantes == 0,
        vencida=dias < 0,
    )
