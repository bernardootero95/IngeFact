"""Reversion de consecutivos de numeracion cuando Alegra rechaza un envio.

Los servicios de emision (facturas, notas credito/debito, documento soporte)
consumen el numero ANTES de llamar a Alegra y lo confirman (commit) enseguida:
asi dos envios concurrentes nunca reciben el mismo numero. El costo es que, si
Alegra rechaza la solicitud, el numero quedaba consumido sin que existiera
ningun documento ante la DIAN -- un hueco permanente en un rango autorizado.

Cuando devolver el numero es seguro:
- HTTP 4xx (AlegraApiError): Alegra respondio que la solicitud es invalida
  (datos faltantes, permisos, etc.) y NO creo nada. Un numero repetido ("Documento
  procesado anteriormente", regla 90) no llega como 4xx sino como 201 con
  legalStatus REJECTED -- ese documento si existe y su numero no se devuelve.
- Timeout o 5xx (AlegraTransientError): es ambiguo -- Alegra pudo haber creado el
  documento aunque no respondiera a tiempo -- asi que NUNCA se revierte.
"""

import logging
import uuid
from typing import Any

from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def revertir_consecutivo(
    db: Session, tabla: Any, consecutivo: int, *condiciones: Any, empresa_id: uuid.UUID, offset: int = 0
) -> bool:
    """Deshace un incremento de `tabla.consecutivo_actual` con un UPDATE atomico.

    Solo actua si el contador sigue siendo exactamente el que dejo ese mismo envio:
    si otro envio concurrente ya lo avanzo, el WHERE no coincide y no se toca nada,
    porque revertir reutilizaria un numero que ese otro envio ya emitio. En ese caso
    el numero queda consumido (mismo criterio que un timeout).

    `offset` es la diferencia entre el valor de la columna en este momento y
    `consecutivo` (el valor que devolvio incrementar_consecutivo). 0 por defecto:
    la columna guarda directamente el ultimo numero usado (ConsecutivoNota/
    ConsecutivoNomina). ResolucionDianService/ResolucionDocumentoSoporteService
    usan offset=1 porque ahi la columna guarda el PROXIMO numero a usar, no el
    ultimo usado (ver el docstring de ResolucionDianService.incrementar_consecutivo).

    Es "mejor esfuerzo": si la reversion falla no debe tapar el error original de
    Alegra que el llamador esta a punto de devolver. Retorna True si revirtio.
    """
    try:
        resultado = db.execute(
            update(tabla)
            .where(*condiciones, tabla.consecutivo_actual == consecutivo + offset)
            .values(consecutivo_actual=consecutivo - 1 + offset)
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("No se pudo revertir el consecutivo %s de la empresa %s.", consecutivo, empresa_id)
        return False

    revertido = resultado.rowcount == 1
    if not revertido:
        logger.warning(
            "No se revirtio el consecutivo %s de la empresa %s: otro envio ya avanzo el contador, el numero queda consumido.",
            consecutivo,
            empresa_id,
        )
    return revertido
