import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.application.empresa_admin_service import EmpresaAdminService
from src.domain.empresa import ActualizarDatosContactoRequest, ActualizarEmpresaRequest, CambiarPlanRequest
from src.infrastructure.db.models import Empresa, Suscripcion


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


def test_actualizar_no_toca_nit_ni_correo(db_session):
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
