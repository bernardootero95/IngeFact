import uuid

import pytest
from fastapi import HTTPException

from src.application.cliente_service import ClienteService
from src.domain.cliente import ActualizarClienteRequest, CrearClienteRequest
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


def _payload(**overrides) -> CrearClienteRequest:
    data = {
        "tipo_identificacion": "31",
        "numero_identificacion": "900123456",
        "nombre": "Cliente Uno SAS",
        "correo_electronico": "cliente@example.com",
    }
    data.update(overrides)
    return CrearClienteRequest(**data)


def test_crear_y_listar(db_session):
    empresa = _crear_empresa(db_session)
    service = ClienteService(db_session)

    service.crear(empresa.id, _payload())

    clientes = service.listar(empresa.id)
    assert len(clientes) == 1
    assert clientes[0].nombre == "Cliente Uno SAS"


def test_crear_documento_duplicado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = ClienteService(db_session)
    service.crear(empresa.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, _payload(nombre="Otro Nombre"))
    assert exc_info.value.status_code == 409


def test_listar_no_mezcla_clientes_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = ClienteService(db_session)
    service.crear(empresa_a.id, _payload())

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_listar_busca_por_nombre_o_documento(db_session):
    empresa = _crear_empresa(db_session)
    service = ClienteService(db_session)
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
    service = ClienteService(db_session)
    cliente = service.crear(empresa_a.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, cliente.id)
    assert exc_info.value.status_code == 404

    with pytest.raises(HTTPException):
        service.obtener(empresa_a.id, uuid.uuid4())


def test_actualizar_cambia_los_datos(db_session):
    empresa = _crear_empresa(db_session)
    service = ClienteService(db_session)
    cliente = service.crear(empresa.id, _payload())

    actualizado = service.actualizar(
        empresa.id,
        cliente.id,
        ActualizarClienteRequest(
            tipo_identificacion="31",
            numero_identificacion="900123456",
            nombre="Cliente Uno Renombrado SAS",
            correo_electronico="nuevo@example.com",
            telefono="3001234567",
        ),
    )

    assert actualizado.nombre == "Cliente Uno Renombrado SAS"
    assert actualizado.telefono == "3001234567"


def test_actualizar_a_documento_de_otro_cliente_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = ClienteService(db_session)
    service.crear(empresa.id, _payload(numero_identificacion="900111111"))
    cliente_b = service.crear(empresa.id, _payload(numero_identificacion="900222222"))

    with pytest.raises(HTTPException) as exc_info:
        service.actualizar(
            empresa.id,
            cliente_b.id,
            ActualizarClienteRequest(
                tipo_identificacion="31",
                numero_identificacion="900111111",
                nombre="Cliente B",
                correo_electronico="b@example.com",
            ),
        )
    assert exc_info.value.status_code == 409


def test_eliminar_es_soft_delete_y_desaparece_del_listado(db_session):
    empresa = _crear_empresa(db_session)
    service = ClienteService(db_session)
    cliente = service.crear(empresa.id, _payload())

    service.eliminar(empresa.id, cliente.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, cliente.id)


def test_eliminar_libera_el_documento_para_reusarlo(db_session):
    empresa = _crear_empresa(db_session)
    service = ClienteService(db_session)
    cliente = service.crear(empresa.id, _payload())
    service.eliminar(empresa.id, cliente.id)

    nuevo = service.crear(empresa.id, _payload(nombre="Cliente Reencarnado"))
    assert nuevo.numero_identificacion == "900123456"
