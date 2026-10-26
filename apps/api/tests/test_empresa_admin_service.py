import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.application.empresa_admin_service import EmpresaAdminService
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.domain.empresa import ActualizarDatosContactoRequest, ActualizarEmpresaRequest, CambiarPlanRequest
from src.infrastructure.db.models import Empresa, Suscripcion, UsuarioEmpresa
from tests.conftest import FakeEmailClient


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def test_listar_filtra_por_estado(db_session):
    _crear_empresa(db_session, numero_identificacion="900618467", estado="activo")
    _crear_empresa(db_session, numero_identificacion="900618468", estado="error_alegra")

    activas = EmpresaAdminService(db_session).listar(estado="activo")

    assert len(activas) == 1
    assert activas[0].estado == "activo"


def test_obtener_404_si_no_existe(db_session):
    with pytest.raises(HTTPException) as exc_info:
        EmpresaAdminService(db_session).obtener(uuid.uuid4())
    assert exc_info.value.status_code == 404


class FakeAlegraClient:
    def __init__(self, exc=None):
        self.exc = exc
        self.updates = []

    def update_company(self, company_id, payload):
        if self.exc:
            raise self.exc
        self.updates.append((company_id, payload))
        return {"id": company_id}


def _crear_usuario(db_session, empresa, email="demo@example.com") -> UsuarioEmpresa:
    usuario = UsuarioEmpresa(empresa_id=empresa.id, nombre="Ana Demo", email=email, password_hash="x")
    db_session.add(usuario)
    db_session.commit()
    return usuario


def _request(empresa, **overrides) -> ActualizarEmpresaRequest:
    data = {"razon_social": empresa.razon_social, "estado": "activo"}
    data.update(overrides)
    return ActualizarEmpresaRequest(**data)


def test_actualizar_sin_correo_no_toca_nit_ni_correo(db_session):
    empresa = _crear_empresa(db_session)
    original_nit = empresa.numero_identificacion
    original_correo = empresa.correo_electronico

    data = ActualizarEmpresaRequest(
        razon_social="Empresa Demo Actualizada SAS",
        direccion="Calle 1 # 2-3",
        tipo_organizacion="1",
        estado="inactivo",
    )
    actualizada = EmpresaAdminService(db_session).actualizar(empresa.id, data)

    assert actualizada.razon_social == "Empresa Demo Actualizada SAS"
    assert actualizada.direccion == "Calle 1 # 2-3"
    assert actualizada.estado == "inactivo"
    assert actualizada.numero_identificacion == original_nit
    assert actualizada.correo_electronico == original_correo


def test_actualizar_correo_cambia_empresa_login_y_alegra_y_avisa_a_ambos(db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-1")
    usuario = _crear_usuario(db_session, empresa)
    alegra, email = FakeAlegraClient(), FakeEmailClient()

    actualizada = EmpresaAdminService(db_session, alegra_client=alegra, email_client=email).actualizar(
        empresa.id, _request(empresa, correo_electronico="Nuevo@Example.com")
    )

    assert actualizada.correo_electronico == "nuevo@example.com"
    db_session.refresh(usuario)
    assert usuario.email == "nuevo@example.com"
    assert alegra.updates[0][0] == "alegra-1"
    assert alegra.updates[0][1]["email"] == "nuevo@example.com"
    assert [e["to"] for e in email.sent] == ["demo@example.com", "nuevo@example.com"]


def test_actualizar_correo_ocupado_por_otra_empresa_responde_409_sin_cambios(db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-1")
    _crear_usuario(db_session, empresa)
    otra = _crear_empresa(db_session, numero_identificacion="900618468", correo_electronico="otra@example.com")
    _crear_usuario(db_session, otra, email="otra@example.com")
    alegra = FakeAlegraClient()

    with pytest.raises(HTTPException) as exc_info:
        EmpresaAdminService(db_session, alegra_client=alegra, email_client=FakeEmailClient()).actualizar(
            empresa.id, _request(empresa, correo_electronico="otra@example.com")
        )

    assert exc_info.value.status_code == 409
    assert alegra.updates == []
    db_session.refresh(empresa)
    assert empresa.correo_electronico == "demo@example.com"


def test_actualizar_si_alegra_rechaza_no_guarda_nada_ni_avisa(db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-1")
    usuario = _crear_usuario(db_session, empresa)
    email = FakeEmailClient()
    alegra = FakeAlegraClient(exc=AlegraApiError(400, {"message": "email invalido"}))

    with pytest.raises(HTTPException) as exc_info:
        EmpresaAdminService(db_session, alegra_client=alegra, email_client=email).actualizar(
            empresa.id, _request(empresa, razon_social="Otra Razon SAS", correo_electronico="nuevo@example.com")
        )

    assert exc_info.value.status_code == 502
    db_session.refresh(empresa)
    db_session.refresh(usuario)
    assert empresa.razon_social == "Empresa Demo SAS"
    assert empresa.correo_electronico == "demo@example.com"
    assert usuario.email == "demo@example.com"
    assert email.sent == []


def test_actualizar_si_alegra_no_responde_no_guarda_nada(db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-1")
    alegra = FakeAlegraClient(exc=AlegraTransientError("timeout"))

    with pytest.raises(HTTPException) as exc_info:
        EmpresaAdminService(db_session, alegra_client=alegra, email_client=FakeEmailClient()).actualizar(
            empresa.id, _request(empresa, razon_social="Otra Razon SAS")
        )

    assert exc_info.value.status_code == 502
    db_session.refresh(empresa)
    assert empresa.razon_social == "Empresa Demo SAS"


def test_actualizar_manda_a_alegra_los_datos_editados(db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-1")
    alegra = FakeAlegraClient()

    EmpresaAdminService(db_session, alegra_client=alegra).actualizar(
        empresa.id,
        _request(
            empresa,
            razon_social="Nueva Razon SAS",
            telefono="3001234567",
            direccion="Calle 1 # 2-3",
            departamento="05",
            municipio="05001",
            regimen="O-13",
            tipo_organizacion="1",
        ),
    )

    payload = alegra.updates[0][1]
    assert payload["name"] == "Nueva Razon SAS"
    assert payload["phone"] == "3001234567"
    assert payload["regimeCode"] == "O-13"
    assert payload["organizationType"] == 1
    assert payload["address"] == {"address": "Calle 1 # 2-3", "department": "05", "city": "05001", "country": "CO"}


def test_actualizar_no_llama_a_alegra_si_no_cambian_sus_datos(db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-1")
    alegra = FakeAlegraClient()

    EmpresaAdminService(db_session, alegra_client=alegra).actualizar(
        empresa.id, _request(empresa, notificacion_correo=False, estado="inactivo")
    )

    assert alegra.updates == []


def test_actualizar_no_manda_regimen_de_sync_que_alegra_no_entiende(db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-1", regimen="48")
    alegra = FakeAlegraClient()

    EmpresaAdminService(db_session, alegra_client=alegra).actualizar(
        empresa.id, _request(empresa, razon_social="Nueva Razon SAS", regimen="48")
    )

    assert "regimeCode" not in alegra.updates[0][1]


def test_actualizar_correo_sin_alegra_ni_envio_exitoso_igual_guarda(db_session):
    # Empresa aun sin id_alegra (p. ej. en error_alegra): no hay a quien
    # avisarle en Alegra; y un fallo de Resend no deshace el cambio.
    empresa = _crear_empresa(db_session)
    _crear_usuario(db_session, empresa)

    actualizada = EmpresaAdminService(db_session, email_client=FakeEmailClient(fail=True)).actualizar(
        empresa.id, _request(empresa, correo_electronico="nuevo@example.com")
    )

    assert actualizada.correo_electronico == "nuevo@example.com"


def test_actualizar_correo_invalido_falla_validacion():
    with pytest.raises(ValidationError):
        ActualizarEmpresaRequest(razon_social="Empresa Demo", correo_electronico="no-es-correo", estado="activo")


def test_actualizar_persiste_regimen_fiscal(db_session):
    empresa = _crear_empresa(db_session)

    data = ActualizarEmpresaRequest(razon_social=empresa.razon_social, regimen_fiscal="48", estado="activo")
    actualizada = EmpresaAdminService(db_session).actualizar(empresa.id, data)

    assert actualizada.regimen_fiscal == "48"


def test_actualizar_regimen_fiscal_invalido_falla_validacion():
    with pytest.raises(ValidationError):
        ActualizarEmpresaRequest(razon_social="Empresa Demo", regimen_fiscal="99", estado="activo")


def test_actualizar_datos_contacto_no_toca_razon_social_ni_nit(db_session):
    empresa = _crear_empresa(db_session, razon_social="Empresa Original SAS")
    original_razon_social = empresa.razon_social
    original_nit = empresa.numero_identificacion

    data = ActualizarDatosContactoRequest(
        nombre_comercial="Nombre Comercial Nuevo",
        telefono="+57 1 234 5678",
        direccion="Cra 45 # 12-30",
    )
    actualizada = EmpresaAdminService(db_session).actualizar_datos_contacto(empresa.id, data)

    assert actualizada.nombre_comercial == "Nombre Comercial Nuevo"
    assert actualizada.telefono == "+57 1 234 5678"
    assert actualizada.direccion == "Cra 45 # 12-30"
    assert actualizada.razon_social == original_razon_social
    assert actualizada.numero_identificacion == original_nit


def test_cambiar_plan_crea_suscripcion_si_no_existe(db_session):
    empresa = _crear_empresa(db_session)

    data = CambiarPlanRequest(max_documentos=1200, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    suscripcion = EmpresaAdminService(db_session).cambiar_plan(empresa.id, data)

    assert suscripcion.max_documentos == 1200
    assert suscripcion.estado == "activa"

    todas = db_session.query(Suscripcion).filter(Suscripcion.empresa_id == empresa.id).all()
    assert len(todas) == 1


def test_cambiar_plan_actualiza_la_suscripcion_activa_existente(db_session):
    empresa = _crear_empresa(db_session)
    service = EmpresaAdminService(db_session)

    primera = CambiarPlanRequest(max_documentos=500, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30))
    service.cambiar_plan(empresa.id, primera)

    segunda = CambiarPlanRequest(max_documentos=2000, fecha_inicio=date(2026, 7, 1), fecha_fin=date(2026, 12, 31))
    resultado = service.cambiar_plan(empresa.id, segunda)

    assert resultado.max_documentos == 2000

    todas = db_session.query(Suscripcion).filter(Suscripcion.empresa_id == empresa.id).all()
    assert len(todas) == 1  # actualizo la misma fila, no creo una segunda


def test_cambiar_plan_resetea_alerta_cuota_enviada(db_session):
    empresa = _crear_empresa(db_session)
    service = EmpresaAdminService(db_session)
    service.cambiar_plan(
        empresa.id, CambiarPlanRequest(max_documentos=10, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    )
    activa = db_session.query(Suscripcion).filter(Suscripcion.empresa_id == empresa.id).one()
    activa.alerta_cuota_enviada = True
    db_session.add(activa)
    db_session.commit()

    resultado = service.cambiar_plan(
        empresa.id, CambiarPlanRequest(max_documentos=2000, fecha_inicio=date(2027, 1, 1), fecha_fin=date(2027, 12, 31))
    )

    assert resultado.alerta_cuota_enviada is False


def test_construir_respuesta_detalle_calcula_documentos_usados_en_vivo(db_session):
    from datetime import datetime, timezone

    from src.infrastructure.db.models import Cliente, Factura

    empresa = _crear_empresa(db_session)
    service = EmpresaAdminService(db_session)
    service.cambiar_plan(
        empresa.id, CambiarPlanRequest(max_documentos=10, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    )

    cliente = Cliente(
        empresa_id=empresa.id,
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        nombre="Cliente de prueba",
        correo_electronico="cliente@example.com",
    )
    db_session.add(cliente)
    db_session.commit()
    db_session.refresh(cliente)

    factura = Factura(
        empresa_id=empresa.id,
        cliente_id=cliente.id,
        fecha=date(2026, 6, 1),
        estado="aceptada",
        fecha_envio=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )
    db_session.add(factura)
    db_session.commit()

    empresa_actualizada = service.obtener(empresa.id)
    respuesta = service.construir_respuesta_detalle(empresa_actualizada)

    # Columna legacy sigue en 0 (nunca se incrementa) -- la respuesta debe
    # reflejar el conteo real, no la columna muerta.
    assert respuesta.suscripcion.documentos_usados == 1


def test_cambiar_plan_registra_una_venta_con_precio_de_la_calculadora_por_defecto(db_session):
    from src.infrastructure.db.models import VentaPaquete

    empresa = _crear_empresa(db_session)
    data = CambiarPlanRequest(max_documentos=500, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    EmpresaAdminService(db_session).cambiar_plan(empresa.id, data)

    venta = db_session.query(VentaPaquete).one()
    assert venta.max_documentos == 500
    assert float(venta.precio) == 317000


def test_cambiar_plan_guarda_el_precio_pactado(db_session):
    from src.infrastructure.db.models import VentaPaquete

    empresa = _crear_empresa(db_session)
    data = CambiarPlanRequest(
        max_documentos=500, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31), precio=250000
    )
    EmpresaAdminService(db_session).cambiar_plan(empresa.id, data)

    assert float(db_session.query(VentaPaquete).one().precio) == 250000


def test_reguardar_o_extender_el_mismo_paquete_no_es_otra_venta(db_session):
    from src.infrastructure.db.models import VentaPaquete

    empresa = _crear_empresa(db_session)
    service = EmpresaAdminService(db_session)
    service.cambiar_plan(
        empresa.id, CambiarPlanRequest(max_documentos=500, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    )
    service.cambiar_plan(
        empresa.id, CambiarPlanRequest(max_documentos=500, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2027, 3, 31))
    )

    assert db_session.query(VentaPaquete).count() == 1


def test_renovar_o_ampliar_el_paquete_es_otra_venta(db_session):
    from src.infrastructure.db.models import VentaPaquete

    empresa = _crear_empresa(db_session)
    service = EmpresaAdminService(db_session)
    service.cambiar_plan(
        empresa.id, CambiarPlanRequest(max_documentos=500, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    )
    service.cambiar_plan(
        empresa.id, CambiarPlanRequest(max_documentos=1500, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31))
    )

    assert db_session.query(VentaPaquete).count() == 2


def test_cambiar_plan_rechaza_precio_negativo():
    with pytest.raises(ValidationError):
        CambiarPlanRequest(max_documentos=10, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31), precio=-1)
