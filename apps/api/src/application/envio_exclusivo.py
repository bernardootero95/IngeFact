"""Serializa por empresa los envios a la DIAN y la edicion de sus documentos.

Cada envio revisa el estado del documento y el cupo del plan y despues llama
a Alegra, que tarda segundos. Sin serializar, dos envios simultaneos pasaban
las mismas revisiones: el mismo borrador se emitia dos veces ante la DIAN y
el cupo se podia exceder (auditoria de seguridad run-1). Editar o borrar un
borrador mientras se envia dejaba en la BD algo distinto a lo emitido
(run-2), por eso esas operaciones toman el mismo lock.

Se usa un advisory lock de Postgres de sesion, no uno de transaccion ni un
FOR UPDATE: los servicios hacen commit a mitad del envio (al tomar el
consecutivo) y esos se soltarian ahi. El lock va en una conexion de un pool
propio y pequeno, no del pool de los requests: si saliera del mismo pool,
cada envio ocuparia dos conexiones y unos pocos envios concurrentes dejaban
sin conexiones a todos los tenants (run-2). Por la misma razon nunca se
espera el lock: si esta tomado se responde 409 de inmediato.
"""

import contextvars
import functools
import threading
import uuid

from fastapi import HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import TimeoutError as PoolTimeoutError

MENSAJE_OCUPADO = "Hay otro envío de documentos en curso para tu empresa. Intenta de nuevo en unos segundos."
MENSAJE_SATURADO = "Hay muchos envíos de documentos en curso. Intenta de nuevo en unos segundos."

# Envios de empresas distintas que pueden correr a la vez en un proceso.
MAX_LOCKS_SIMULTANEOS = 10
ESPERA_CONEXION_SEGUNDOS = 3

# Empresas cuyo lock ya tiene este contexto: anular_factura llama a enviar y
# eventos masivos llama a enviar_evento por cada factura; sin esto se
# bloquearian contra su propio lock.
_empresas_con_lock: contextvars.ContextVar[frozenset] = contextvars.ContextVar("empresas_con_lock", default=frozenset())

_motores: dict[str, Engine] = {}
_motores_lock = threading.Lock()


def _clave(empresa_id: uuid.UUID) -> int:
    return int.from_bytes(uuid.UUID(str(empresa_id)).bytes[:8], "big", signed=True)


def _motor_de_locks(bind) -> Engine:
    """Engine dedicado a los locks, uno por base de datos (la del request)."""
    url = getattr(bind, "engine", bind).url
    clave = url.render_as_string(hide_password=False)
    with _motores_lock:
        motor = _motores.get(clave)
        if motor is None:
            motor = create_engine(
                url,
                pool_size=MAX_LOCKS_SIMULTANEOS,
                max_overflow=0,
                pool_timeout=ESPERA_CONEXION_SEGUNDOS,
                pool_pre_ping=True,
            )
            _motores[clave] = motor
        return motor


def envio_exclusivo(metodo):
    """Decora un metodo de servicio `(self, empresa_id, ...)` cuyo `self.db`
    es la Session del request."""

    @functools.wraps(metodo)
    def envoltura(self, empresa_id, *args, **kwargs):
        tomadas = _empresas_con_lock.get()
        if empresa_id in tomadas:
            return metodo(self, empresa_id, *args, **kwargs)

        clave = _clave(empresa_id)
        try:
            conexion = _motor_de_locks(self.db.get_bind()).connect()
        except PoolTimeoutError as exc:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, MENSAJE_SATURADO) from exc
        try:
            obtenido = conexion.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": clave}).scalar()
            conexion.commit()
            if not obtenido:
                raise HTTPException(status.HTTP_409_CONFLICT, MENSAJE_OCUPADO)

            # Lo leido antes de tomar el lock puede estar viejo (otro envio
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
