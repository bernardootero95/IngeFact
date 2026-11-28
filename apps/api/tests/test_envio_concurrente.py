"""Envios simultaneos a la DIAN (auditoria de seguridad run-1).

Antes, dos /enviar a la vez sobre el mismo borrador emitian dos documentos
ante la DIAN, y varios envios a la vez se pasaban del cupo del plan. Estos
tests usan sesiones de BD independientes por hilo, como dos requests reales.
"""

import threading
import time

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.application.factura_service import FacturaService
from src.infrastructure.db.models import Factura
from tests.conftest import TEST_DATABASE_URL
from tests.test_factura_service import (
    _FakeAlegraClient,
    _crear_cliente,
    _crear_empresa,
    _crear_producto,
    _crear_resolucion,
    _crear_suscripcion,
    _payload,
)

_Sesiones = sessionmaker(bind=create_engine(TEST_DATABASE_URL))


class _AlegraLento(_FakeAlegraClient):
    """create_invoice tarda lo suficiente para que dos envios se solapen si
    nada los serializa; cuenta llamadas y cuantas corrieron a la vez."""

    def __init__(self):
        super().__init__()
        self.llamadas = 0
        self.en_curso = 0
        self.max_simultaneas = 0
        self._lock = threading.Lock()

    def create_invoice(self, payload):
        with self._lock:
            self.llamadas += 1
            self.en_curso += 1
            self.max_simultaneas = max(self.max_simultaneas, self.en_curso)
            n = self.llamadas
        time.sleep(0.5)
        with self._lock:
            self.en_curso -= 1
        return {"invoice": {"id": f"inv-{n}", "cufe": f"cufe-{n}", "fullNumber": f"SETP{n}", "legalStatus": "ACCEPTED"}}


def _en_paralelo(n, fn):
    resultados = [None] * n
    inicio = threading.Event()

    def trabajo(i):
        inicio.wait()
        try:
            resultados[i] = fn(i)
        except HTTPException as exc:
            resultados[i] = exc.status_code

    hilos = [threading.Thread(target=trabajo, args=(i,)) for i in range(n)]
    for h in hilos:
        h.start()
    inicio.set()
    for h in hilos:
        h.join(60)
    return resultados


def _escenario(db_session, max_documentos=1000):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    _crear_suscripcion(db_session, empresa.id, max_documentos=max_documentos)
    return empresa, cliente, producto


def _enviar(fake, empresa_id, factura_id):
    sesion = _Sesiones()
    try:
        return FacturaService(sesion, alegra_client=fake).enviar(empresa_id, factura_id, forma_pago="1", metodo_pago="10").estado
    finally:
        sesion.close()


def test_dos_envios_simultaneos_del_mismo_borrador_emiten_un_solo_documento(db_session):
    empresa, cliente, producto = _escenario(db_session)
    factura = FacturaService(db_session, alegra_client=_FakeAlegraClient()).crear_borrador(
        empresa.id, _payload(cliente.id, producto.id)
    )
    fake = _AlegraLento()

    resultados = _en_paralelo(2, lambda _i: _enviar(fake, empresa.id, factura.id))

    assert fake.llamadas == 1
    assert sorted(resultados, key=str) == [409, "aceptada"]


def test_envios_simultaneos_no_exceden_el_cupo_del_plan(db_session):
    empresa, cliente, producto = _escenario(db_session, max_documentos=1)
    service = FacturaService(db_session, alegra_client=_FakeAlegraClient())
    borradores = [service.crear_borrador(empresa.id, _payload(cliente.id, producto.id)).id for _ in range(3)]
    fake = _AlegraLento()

    resultados = _en_paralelo(3, lambda i: _enviar(fake, empresa.id, borradores[i]))

    db_session.expire_all()
    aceptadas = db_session.query(Factura).filter(Factura.empresa_id == empresa.id, Factura.estado == "aceptada").count()
    assert aceptadas == 1
    assert fake.llamadas == 1
    assert sorted(resultados, key=str) == [409, 409, "aceptada"]


def test_documento_esperando_a_la_dian_reserva_cupo(db_session):
    empresa, cliente, producto = _escenario(db_session, max_documentos=1)
    service = FacturaService(db_session, alegra_client=_FakeAlegraClient())
    pendiente = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    pendiente.estado = "enviada"
    pendiente.fecha_envio = None
    db_session.add(pendiente)
    db_session.commit()
    nueva = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    try:
        FacturaService(db_session, alegra_client=_AlegraLento()).enviar(empresa.id, nueva.id, forma_pago="1", metodo_pago="10")
        estado = "enviada-sin-cupo"
    except HTTPException as exc:
        estado = exc.status_code
    assert estado == 409


def test_envios_de_empresas_distintas_no_se_esperan(db_session):
    a = _escenario(db_session)
    b_empresa = _crear_empresa(db_session, numero_identificacion="900777777", id_alegra="alegra-b")
    b = (b_empresa, _crear_cliente(db_session, b_empresa.id), _crear_producto(db_session, b_empresa.id))
    _crear_resolucion(db_session, b_empresa.id)
    _crear_suscripcion(db_session, b_empresa.id)
    servicio = FacturaService(db_session, alegra_client=_FakeAlegraClient())
    facturas = [servicio.crear_borrador(e.id, _payload(c.id, p.id)) for e, c, p in (a, b)]
    fake = _AlegraLento()

    resultados = _en_paralelo(2, lambda i: _enviar(fake, facturas[i].empresa_id, facturas[i].id))

    assert resultados == ["aceptada", "aceptada"]
    assert fake.max_simultaneas == 2
