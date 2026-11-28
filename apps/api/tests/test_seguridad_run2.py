"""Regresiones de los hallazgos confirmados de la auditoria de seguridad run-2."""

import io
import threading
import time
import uuid
import zipfile

import pytest
from fastapi import HTTPException
from openpyxl import Workbook, load_workbook
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from src.application import suscripcion_service
from src.application.auth_service import AuthService
from src.application.correo_documento import MAX_REENVIOS_POR_DOCUMENTO, limitar_reenvio_por_correo
from src.application.envio_exclusivo import _clave, _motor_de_locks
from src.application.exportacion_service import ExportacionService, Hoja
from src.application.factura_service import FacturaService
from src.core.reporte_dian_parser import ReporteDianInvalido, parsear_reporte_dian
from src.infrastructure.db.models import Factura, UsuarioEmpresa
from tests.conftest import TEST_DATABASE_URL
from tests.test_auth_routes import tenant_user  # noqa: F401 -- fixture
from tests.test_envio_concurrente import _AlegraLento, _en_paralelo, _escenario
from tests.test_factura_service import LineaFacturaRequest, _FakeAlegraClient, _payload

_motor = create_engine(TEST_DATABASE_URL)
_Sesiones = sessionmaker(bind=_motor)


class _LockTomado:
    """Simula un envio en curso de la empresa: toma su advisory lock en otra
    conexion."""

    def __init__(self, empresa_id):
        self._clave = _clave(empresa_id)

    def __enter__(self):
        self._conexion = _motor.connect()
        self._conexion.execute(text("SELECT pg_advisory_lock(:k)"), {"k": self._clave})
        self._conexion.commit()
        return self

    def __exit__(self, *exc):
        self._conexion.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": self._clave})
        self._conexion.commit()
        self._conexion.close()


def _borrador(db_session):
    empresa, cliente, producto = _escenario(db_session)
    factura = FacturaService(db_session, alegra_client=_FakeAlegraClient()).crear_borrador(
        empresa.id, _payload(cliente.id, producto.id)
    )
    return empresa, cliente, producto, factura


# --- Lock de envio: no espera ni usa el pool de los requests -----------------


def test_el_lock_de_envio_usa_un_pool_propio(db_session):
    assert _motor_de_locks(db_session.get_bind()) is not db_session.get_bind()


def test_envio_con_otro_envio_en_curso_responde_409_sin_esperar(db_session):
    empresa, _c, _p, factura = _borrador(db_session)

    with _LockTomado(empresa.id):
        inicio = time.monotonic()
        with pytest.raises(HTTPException) as exc:
            FacturaService(db_session, alegra_client=_FakeAlegraClient()).enviar(
                empresa.id, factura.id, forma_pago="1", metodo_pago="10"
            )
        assert time.monotonic() - inicio < 2

    assert exc.value.status_code == 409


def test_muchos_envios_en_espera_no_agotan_el_pool_de_los_requests(db_session):
    """Antes cada envio en espera retenia dos conexiones del pool de los
    requests hasta 30 s; con un pool de 3, otra empresa recibia 500."""
    empresa, _c, _p, factura = _borrador(db_session)
    pool_chico = create_engine(TEST_DATABASE_URL, pool_size=3, max_overflow=0, pool_timeout=2)
    Sesiones = sessionmaker(bind=pool_chico)

    def enviar(_i):
        sesion = Sesiones()
        try:
            sesion.execute(text("SELECT 1"))  # como get_current_tenant
            return FacturaService(sesion, alegra_client=_FakeAlegraClient()).enviar(
                empresa.id, factura.id, forma_pago="1", metodo_pago="10"
            ).estado
        finally:
            sesion.close()

    try:
        with _LockTomado(empresa.id):
            resultados = _en_paralelo(6, enviar)
            otra = Sesiones()
            try:
                assert otra.execute(text("SELECT 1")).scalar() == 1
            finally:
                otra.close()
    finally:
        pool_chico.dispose()

    assert resultados == [409] * 6


# --- Edicion y borrado durante un envio ---------------------------------------


def test_no_se_edita_ni_borra_un_borrador_mientras_se_envia(db_session):
    empresa, cliente, producto, factura = _borrador(db_session)
    servicio = FacturaService(db_session, alegra_client=_FakeAlegraClient())

    with _LockTomado(empresa.id):
        with pytest.raises(HTTPException) as editar:
            servicio.actualizar_borrador(empresa.id, factura.id, _payload(cliente.id, producto.id))
        with pytest.raises(HTTPException) as borrar:
            servicio.eliminar_borrador(empresa.id, factura.id)

    assert editar.value.status_code == 409
    assert borrar.value.status_code == 409
    db_session.expire_all()
    assert db_session.get(Factura, factura.id).eliminado is None


def test_editar_durante_un_envio_real_no_cambia_lo_emitido(db_session):
    empresa, cliente, producto, factura = _borrador(db_session)
    total_original = factura.total
    fake = _AlegraLento()

    def trabajo(i):
        sesion = _Sesiones()
        try:
            servicio = FacturaService(sesion, alegra_client=fake)
            if i == 0:
                return servicio.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10").estado
            time.sleep(0.2)  # el envio ya esta dentro de create_invoice
            payload = _payload(cliente.id, producto.id, lineas=[LineaFacturaRequest(producto_id=producto.id, cantidad=7)])
            return servicio.actualizar_borrador(empresa.id, factura.id, payload).estado
        finally:
            sesion.close()

    resultados = _en_paralelo(2, trabajo)

    assert resultados == ["aceptada", 409]
    db_session.expire_all()
    assert db_session.get(Factura, factura.id).total == total_original


# --- Cupo: webhook entre las dos lecturas --------------------------------------


def test_un_webhook_entre_las_lecturas_del_cupo_no_regala_un_documento(db_session, monkeypatch):
    empresa, cliente, producto = _escenario(db_session, max_documentos=1)
    servicio = FacturaService(db_session, alegra_client=_FakeAlegraClient())
    pendiente = servicio.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    pendiente.estado = "enviada"
    db_session.commit()
    pendiente_id = pendiente.id

    original = suscripcion_service.documentos_disponibles

    def con_webhook_intercalado(db, empresa_id):
        # El webhook de Alegra acepta el documento pendiente justo aqui.
        sesion = _Sesiones()
        try:
            sesion.execute(
                text("UPDATE facturas SET estado = 'aceptada', fecha_envio = now() WHERE id = :id"), {"id": pendiente_id}
            )
            sesion.commit()
        finally:
            sesion.close()
        return original(db, empresa_id)

    monkeypatch.setattr(suscripcion_service, "documentos_disponibles", con_webhook_intercalado)

    with pytest.raises(HTTPException) as exc:
        suscripcion_service.verificar_cupo_disponible(db_session, empresa.id)
    assert exc.value.status_code == 409


# --- Refresh token -------------------------------------------------------------


def test_dos_canjes_simultaneos_del_mismo_refresh_dan_una_sola_sesion(db_session, tenant_user):  # noqa: F811
    tokens = AuthService(db_session).login_tenant("tenant@ingefact.test", "Sandbox123!")

    def canjear(_i):
        sesion = _Sesiones()
        try:
            return AuthService(sesion).refresh(tokens.refresh_token).refresh_token
        finally:
            sesion.close()

    resultados = _en_paralelo(2, canjear)

    assert sorted(type(r).__name__ for r in resultados) == ["int", "str"]
    assert 401 in resultados


def test_un_reset_mientras_se_canjea_no_deja_vivo_el_token_nuevo(db_session, tenant_user):  # noqa: F811
    """El reset toma el mismo lock del usuario que el canje: espera a que el
    canje termine y borra tambien el token que este acaba de emitir."""
    user, _empresa = tenant_user
    tokens = AuthService(db_session).login_tenant("tenant@ingefact.test", "Sandbox123!")
    canje_dentro = threading.Event()

    def resetear():
        canje_dentro.wait(5)
        sesion = _Sesiones()
        try:
            # Lo mismo que hace reset_password antes de borrar las sesiones.
            sesion.get(UsuarioEmpresa, user.id, with_for_update=True)
            AuthService(sesion)._eliminar_refresh_tokens(user_id=user.id, user_type="tenant")
            sesion.commit()
        finally:
            sesion.close()

    canje = _Sesiones()
    try:
        servicio = AuthService(canje)
        emitir_original = servicio._issue_tokens

        def emitir_con_pausa(**kwargs):
            canje_dentro.set()
            time.sleep(0.5)  # el reset llega mientras el canje sigue abierto
            return emitir_original(**kwargs)

        servicio._issue_tokens = emitir_con_pausa
        hilo = threading.Thread(target=resetear)
        hilo.start()
        nuevo = servicio.refresh(tokens.refresh_token)
        hilo.join(10)
    finally:
        canje.close()

    verificacion = _Sesiones()
    try:
        with pytest.raises(HTTPException) as exc:
            AuthService(verificacion).refresh(nuevo.refresh_token)
    finally:
        verificacion.close()
    assert exc.value.status_code == 401


# --- Excel ---------------------------------------------------------------------


def test_exportacion_no_escribe_formulas_con_datos_del_tenant():
    libro = Workbook()
    ExportacionService._escribir_hoja(libro, Hoja("Clientes", ("Teléfono",), [('=HYPERLINK("//q.zz")',)]))
    salida = io.BytesIO()
    libro.save(salida)

    celda = load_workbook(io.BytesIO(salida.getvalue()))["Clientes"]["A2"]
    assert celda.data_type == "s"
    assert celda.value == '=HYPERLINK("//q.zz")'


def test_reporte_dian_rechaza_un_zip_que_se_infla_sin_mirar_el_nombre_de_la_parte():
    salida = io.BytesIO()
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED) as archivo:
        archivo.writestr("xl/cadenas-raras.xml", b"<si><t>a</t></si>" * 500_000)
    inicio = time.monotonic()
    with pytest.raises(ReporteDianInvalido):
        parsear_reporte_dian(salida.getvalue())
    assert time.monotonic() - inicio < 1


def test_reporte_dian_rechaza_un_zip_con_demasiado_contenido_descomprimido():
    salida = io.BytesIO()
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_STORED) as archivo:
        for i in range(3):
            archivo.writestr(f"xl/parte{i}.xml", b"x" * (5 * 1024 * 1024))
    with pytest.raises(ReporteDianInvalido, match="demasiado grande"):
        parsear_reporte_dian(salida.getvalue())


# --- Reenvio de correos --------------------------------------------------------


def test_reenvio_por_correo_tiene_limite_por_documento():
    empresa_id, documento_id = uuid.uuid4(), uuid.uuid4()
    for _ in range(MAX_REENVIOS_POR_DOCUMENTO):
        limitar_reenvio_por_correo(empresa_id, documento_id)
    with pytest.raises(HTTPException) as exc:
        limitar_reenvio_por_correo(empresa_id, documento_id)
    assert exc.value.status_code == 429
    limitar_reenvio_por_correo(empresa_id, uuid.uuid4())  # otro documento si puede
