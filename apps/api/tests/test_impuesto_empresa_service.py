import uuid

import pytest
from fastapi import HTTPException

from src.application.impuesto_empresa_service import ImpuestoEmpresaService
from src.domain.impuesto_empresa import ActualizarImpuestoEmpresaRequest, CrearImpuestoEmpresaRequest
from src.infrastructure.db.models import Empresa


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


def test_crear_y_listar(db_session):
    empresa = _crear_empresa(db_session)
    service = ImpuestoEmpresaService(db_session)

    service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))

    impuestos = service.listar(empresa.id)
    assert len(impuestos) == 1
    assert float(impuestos[0].tarifa) == 19


def test_crear_preset_duplicado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = ImpuestoEmpresaService(db_session)
    service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))
    assert exc_info.value.status_code == 409


def test_mismo_tributo_con_tarifa_distinta_no_es_duplicado(db_session):
    empresa = _crear_empresa(db_session)
    service = ImpuestoEmpresaService(db_session)
    service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))
    service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=5))

    assert len(service.listar(empresa.id)) == 2


def test_listar_no_mezcla_impuestos_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = ImpuestoEmpresaService(db_session)
    service.crear(empresa_a.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_obtener_404_si_no_existe_o_es_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = ImpuestoEmpresaService(db_session)
    impuesto = service.crear(empresa_a.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, impuesto.id)
    assert exc_info.value.status_code == 404

    with pytest.raises(HTTPException):
        service.obtener(empresa_a.id, uuid.uuid4())


def test_actualizar_cambia_tributo_y_tarifa(db_session):
    empresa = _crear_empresa(db_session)
    service = ImpuestoEmpresaService(db_session)
    impuesto = service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))

    actualizado = service.actualizar(
        empresa.id, impuesto.id, ActualizarImpuestoEmpresaRequest(tributo="01", tarifa=5)
    )

    assert float(actualizado.tarifa) == 5


def test_actualizar_al_preset_de_otro_impuesto_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = ImpuestoEmpresaService(db_session)
    service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))
    impuesto_b = service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=5))

    with pytest.raises(HTTPException) as exc_info:
        service.actualizar(empresa.id, impuesto_b.id, ActualizarImpuestoEmpresaRequest(tributo="01", tarifa=19))
    assert exc_info.value.status_code == 409


def test_eliminar_es_soft_delete_y_libera_el_preset(db_session):
    empresa = _crear_empresa(db_session)
    service = ImpuestoEmpresaService(db_session)
    impuesto = service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))

    service.eliminar(empresa.id, impuesto.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, impuesto.id)

    nuevo = service.crear(empresa.id, CrearImpuestoEmpresaRequest(tributo="01", tarifa=19))
    assert float(nuevo.tarifa) == 19
