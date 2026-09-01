import uuid

import pytest
from fastapi import HTTPException

from src.application.producto_service import ProductoService
from src.domain.producto import ActualizarProductoRequest, CrearProductoRequest
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


def _payload(**overrides) -> CrearProductoRequest:
    data = {
        "tipo": "bien",
        "codigo": "PROD-001",
        "nombre": "Producto Uno",
        "precio": 15000,
        "unidad_medida": "94",
    }
    data.update(overrides)
    return CrearProductoRequest(**data)


def test_crear_y_listar(db_session):
    empresa = _crear_empresa(db_session)
    service = ProductoService(db_session)

    service.crear(empresa.id, _payload())

    productos = service.listar(empresa.id)
    assert len(productos) == 1
    assert productos[0].nombre == "Producto Uno"


def test_crear_codigo_duplicado_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = ProductoService(db_session)
    service.crear(empresa.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, _payload(nombre="Otro Nombre"))
    assert exc_info.value.status_code == 409


def test_listar_no_mezcla_productos_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = ProductoService(db_session)
    service.crear(empresa_a.id, _payload())

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_listar_busca_por_nombre_o_codigo(db_session):
    empresa = _crear_empresa(db_session)
    service = ProductoService(db_session)
    service.crear(empresa.id, _payload(codigo="PROD-001", nombre="Asesoria contable"))
    service.crear(empresa.id, _payload(codigo="PROD-002", nombre="Otro producto"))

    por_nombre = service.listar(empresa.id, search="asesoria")
    assert len(por_nombre) == 1
    assert por_nombre[0].codigo == "PROD-001"

    por_codigo = service.listar(empresa.id, search="PROD-002")
    assert len(por_codigo) == 1
    assert por_codigo[0].nombre == "Otro producto"


def test_obtener_404_si_no_existe_o_es_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    service = ProductoService(db_session)
    producto = service.crear(empresa_a.id, _payload())

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, producto.id)
    assert exc_info.value.status_code == 404

    with pytest.raises(HTTPException):
        service.obtener(empresa_a.id, uuid.uuid4())


def test_actualizar_cambia_los_datos(db_session):
    empresa = _crear_empresa(db_session)
    service = ProductoService(db_session)
    producto = service.crear(empresa.id, _payload())

    actualizado = service.actualizar(
        empresa.id,
        producto.id,
        ActualizarProductoRequest(
            tipo="servicio",
            codigo="PROD-001",
            nombre="Producto Renombrado",
            precio=20000,
            unidad_medida="94",
            tributo="01",
            tarifa_impuesto=19,
        ),
    )

    assert actualizado.nombre == "Producto Renombrado"
    assert actualizado.tipo == "servicio"
    assert float(actualizado.precio) == 20000
    assert float(actualizado.tarifa_impuesto) == 19


def test_actualizar_a_codigo_de_otro_producto_lanza_409(db_session):
    empresa = _crear_empresa(db_session)
    service = ProductoService(db_session)
    service.crear(empresa.id, _payload(codigo="PROD-001"))
    producto_b = service.crear(empresa.id, _payload(codigo="PROD-002"))

    with pytest.raises(HTTPException) as exc_info:
        service.actualizar(
            empresa.id,
            producto_b.id,
            ActualizarProductoRequest(
                tipo="bien", codigo="PROD-001", nombre="Producto B", precio=1000, unidad_medida="94"
            ),
        )
    assert exc_info.value.status_code == 409


def test_eliminar_es_soft_delete_y_libera_el_codigo(db_session):
    empresa = _crear_empresa(db_session)
    service = ProductoService(db_session)
    producto = service.crear(empresa.id, _payload())

    service.eliminar(empresa.id, producto.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, producto.id)

    nuevo = service.crear(empresa.id, _payload(nombre="Producto Reencarnado"))
    assert nuevo.codigo == "PROD-001"
