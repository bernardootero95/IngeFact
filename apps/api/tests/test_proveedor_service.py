import uuid

import pytest
from fastapi import HTTPException

from src.application.proveedor_service import ProveedorService
from src.core.nit import nit_check_digit
from src.domain.proveedor import ActualizarProveedorRequest, CrearProveedorRequest
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


def _payload(**overrides) -> CrearProveedorRequest:
    data = {
        "tipo_identificacion": "31",
        "numero_identificacion": "900123456",
        "nombre": "Proveedor Uno SAS",
        "correo_electronico": "proveedor@example.com",
    }
    data.update(overrides)
    data.setdefault("digito_verificacion", nit_check_digit(data["numero_identificacion"]))
    return CrearProveedorRequest(**data)


def test_crear_y_listar(db_session):
    empresa = _crear_empresa(db_session)
    service = ProveedorService(db_session)

    service.crear(empresa.id, _payload())

    proveedores = service.listar(empresa.id)
    assert len(proveedores) == 1
    assert proveedores[0].nombre == "Proveedor Uno SAS"


def test_dv_obligatorio_cuando_tipo_identificacion_es_nit():
    with pytest.raises(ValueError, match="digito de verificacion es obligatorio"):
        CrearProveedorRequest(
            tipo_identificacion="31",
            numero_identificacion="900123456",
            nombre="Proveedor Uno SAS",
            correo_electronico="proveedor@example.com",
        )


def test_dv_se_ignora_si_el_tipo_no_es_nit():
    proveedor = _payload(tipo_identificacion="13", numero_identificacion="1000000000", digito_verificacion="9")
    assert proveedor.digito_verificacion is None


def test_crear_documento_duplicado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = ProveedorService(db_session)
    service.crear(empresa.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, _payload(nombre="Otro Nombre"))
    assert exc_info.value.status_code == 409


def test_listar_no_mezcla_proveedores_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = ProveedorService(db_session)
    service.crear(empresa_a.id, _payload())

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_listar_busca_por_nombre_o_documento(db_session):
    empresa = _crear_empresa(db_session)
    service = ProveedorService(db_session)
    service.crear(empresa.id, _payload(numero_identificacion="900111111", nombre="Acme SAS"))
    service.crear(empresa.id, _payload(numero_identificacion="900222222", nombre="Otra Empresa"))

    por_nombre = service.listar(empresa.id, search="acme")
    assert len(por_nombre) == 1
    assert por_nombre[0].nombre == "Acme SAS"

    por_documento = service.listar(empresa.id, search="900222222")
    assert len(por_documento) == 1
    assert por_documento[0].numero_identificacion == "900222222"


def test_obtener_404_si_no_existe_o_es_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = ProveedorService(db_session)
    proveedor = service.crear(empresa_a.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, proveedor.id)
    assert exc_info.value.status_code == 404

    with pytest.raises(HTTPException):
        service.obtener(empresa_a.id, uuid.uuid4())


def test_actualizar_cambia_los_datos(db_session):
    empresa = _crear_empresa(db_session)
    service = ProveedorService(db_session)
    proveedor = service.crear(empresa.id, _payload())

    actualizado = service.actualizar(
        empresa.id,
        proveedor.id,
        ActualizarProveedorRequest(
            tipo_identificacion="31",
            numero_identificacion="900123456",
            digito_verificacion="8",
            nombre="Proveedor Uno Renombrado SAS",
            correo_electronico="nuevo@example.com",
            telefono="3001234567",
        ),
    )

    assert actualizado.nombre == "Proveedor Uno Renombrado SAS"
    assert actualizado.telefono == "3001234567"


def test_eliminar_es_soft_delete_y_libera_el_documento(db_session):
    empresa = _crear_empresa(db_session)
    service = ProveedorService(db_session)
    proveedor = service.crear(empresa.id, _payload())

    service.eliminar(empresa.id, proveedor.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, proveedor.id)

    nuevo = service.crear(empresa.id, _payload(nombre="Proveedor Reencarnado"))
    assert nuevo.numero_identificacion == "900123456"
