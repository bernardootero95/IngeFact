"""Serializa por empresa los envios a la DIAN.

Cada envio revisa el estado del documento y el cupo del plan y despues llama
a Alegra, que tarda segundos. Sin serializar, dos envios simultaneos pasaban
las mismas revisiones: el mismo borrador se emitia dos veces ante la DIAN y
el cupo se podia exceder (hallazgos de la auditoria de seguridad run-1).

Se usa un advisory lock de Postgres de sesion sobre una conexion dedicada,
no la de la Session: los servicios hacen commit a mitad del envio (al tomar
el consecutivo) y un lock de transaccion o un FOR UPDATE se soltaria ahi.
El lock es por empresa, asi que tenants distintos no se esperan entre si.
"""

import contextvars
import functools
import uuid

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

ESPERA_MAXIMA = "30s"
MENSAJE_OCUPADO = "Hay otro envío de documentos en curso para tu empresa. Intenta de nuevo en unos segundos."

# Empresas cuyo lock ya tiene este contexto: anular_factura llama a enviar y
# eventos masivos llama a enviar_evento por cada factura; sin esto se
# bloquearian contra su propio lock.
_empresas_con_lock: contextvars.ContextVar[frozenset] = contextvars.ContextVar("empresas_con_lock", default=frozenset())


def _clave(empresa_id: uuid.UUID) -> int:
    return int.from_bytes(uuid.UUID(str(empresa_id)).bytes[:8], "big", signed=True)


def envio_exclusivo(metodo):
    """Decora un metodo de servicio `(self, empresa_id, ...)` cuyo `self.db`
    es la Session del request."""

    @functools.wraps(metodo)
    def envoltura(self, empresa_id, *args, **kwargs):
        tomadas = _empresas_con_lock.get()
        if empresa_id in tomadas:
            return metodo(self, empresa_id, *args, **kwargs)

        clave = _clave(empresa_id)
        conexion = self.db.get_bind().connect()
        try:
            try:
                conexion.execute(text(f"SET lock_timeout = '{ESPERA_MAXIMA}'"))
                conexion.execute(text("SELECT pg_advisory_lock(:k)"), {"k": clave})
                conexion.commit()
            except OperationalError as exc:
                raise HTTPException(status.HTTP_409_CONFLICT, MENSAJE_OCUPADO) from exc

            # Lo leido antes de esperar el lock puede estar viejo (otro envio
            # acaba de terminar): se relee todo desde la BD.
            self.db.expire_all()
            marca = _empresas_con_lock.set(tomadas | {empresa_id})
            try:
                return metodo(self, empresa_id, *args, **kwargs)
            finally:
                _empresas_con_lock.reset(marca)
                try:
                    conexion.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": clave})
                    conexion.commit()
                except Exception:  # noqa: BLE001
                    # Si no se pudo soltar, se descarta la conexion para que el
                    # lock no quede vivo en el pool.
                    conexion.invalidate()
        finally:
            conexion.close()

    return envoltura
