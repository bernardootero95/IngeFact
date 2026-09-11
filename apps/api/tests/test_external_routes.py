"""Pruebas HTTP reales (TestClient) de /api/v1/external/v1/* -- mismo
patron que test_http_security.py: se ejercita el stack completo (header
X-API-Key, get_current_api_key, aislamiento multi-tenant), no se llama a
las funciones Python directo."""

from datetime import date

import pytest

from src.application.api_key_service import ApiKeyService
from src.core.security import hash_password
from src.infrastructure.db.models import Cliente, Empresa, Producto, ResolucionDian, Suscripcion, UsuarioAdmin


class _FakeAlegraClient:
    """Igual patron que test_webhooks.py -- reemplaza AlegraClient en
    factura_service para no golpear el sandbox real. create_invoice siempre
    responde ACCEPTED, suficiente para estos tests (no verifican el detalle
    de la respuesta de Alegra, solo el flujo de la API externa)."""

    _contador = 0

    def create_invoice(self, payload: dict) -> dict:
        _FakeAlegraClient._contador += 1
        return {
            "invoice": {
                "id": f"inv-{_FakeAlegraClient._contador}",
                "cufe": f"cufe-{_FakeAlegraClient._contador}",
                "fullNumber": f"SETP{_FakeAlegraClient._contador}",
                "legalStatus": "ACCEPTED",
            }
        }

    def get_invoice(self, invoice_id: str) -> dict:
        return {"files": {"xml": "https://s3.example.com/factura.xml"}}

    def fetch_raw(self, url: str) -> bytes:
        return b"<xml/>"


@pytest.fixture(autouse=True)
def _no_real_alegra(monkeypatch):
    monkeypatch.setattr("src.application.factura_service.AlegraClient", _FakeAlegraClient)


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Externa SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
        "id_alegra": "alegra-empresa-1",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_admin(db_session) -> UsuarioAdmin:
    import uuid

    admin = UsuarioAdmin(
        nombre="Staff Test",
        email=f"staff-{uuid.uuid4()}@example.com",
        password_hash=hash_password("ClaveAdmin123!"),
        estado="activo",
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


def _crear_api_key(db_session, empresa: Empresa, admin: UsuarioAdmin | None = None) -> str:
    admin = admin or _crear_admin(db_session)
    _registro, key_en_claro = ApiKeyService(db_session).crear(empresa.id, "Integracion Test", admin.id)
    return key_en_claro


def _crear_cliente(db_session, empresa_id, **overrides) -> Cliente:
    data = {
        "empresa_id": empresa_id,
        "tipo_identificacion": "13",
        "numero_identificacion": "1000000000",
        "nombre": "Cliente de prueba",
        "correo_electronico": "cliente@example.com",
    }
    data.update(overrides)
    cliente = Cliente(**data)
    db_session.add(cliente)
    db_session.commit()
    db_session.refresh(cliente)
    return cliente


def _crear_resolucion(db_session, empresa_id, **overrides) -> ResolucionDian:
    data = {
        "empresa_id": empresa_id,
        "numero_resolucion": "18760000001",
        "prefijo": "SETP",
        "rango_minimo": 1,
        "rango_maximo": 1000,
        "fecha_inicio": date(2026, 1, 1),
        "fecha_fin": date(2030, 1, 1),
        "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        "consecutivo_actual": 1,
    }
    data.update(overrides)
    resolucion = ResolucionDian(**data)
    db_session.add(resolucion)
    db_session.commit()
    db_session.refresh(resolucion)
    return resolucion


def _crear_suscripcion(db_session, empresa_id, **overrides) -> Suscripcion:
    data = {
        "empresa_id": empresa_id,
        "max_documentos": 1000,
        "fecha_inicio": date(2026, 1, 1),
        "fecha_fin": date(2030, 1, 1),
        "estado": "activa",
    }
    data.update(overrides)
    suscripcion = Suscripcion(**data)
    db_session.add(suscripcion)
    db_session.commit()
    db_session.refresh(suscripcion)
    return suscripcion


def _headers(api_key: str) -> dict:
    return {"X-API-Key": api_key}


def _item_embebido(**overrides) -> dict:
    data = {
        "codigo": "EXT-001",
        "nombre": "Item externo",
        "unidad_medida": "94",
        "cantidad": 1,
        "precio_unitario": 20000,
    }
    data.update(overrides)
    return data


def test_sin_api_key_es_rechazado(api_client, db_session):
    empresa = _crear_empresa(db_session)
    _crear_cliente(db_session, empresa.id)

    response = api_client.get("/api/v1/external/v1/clientes")

    assert response.status_code == 401


def test_api_key_revocada_es_rechazada(api_client, db_session):
    empresa = _crear_empresa(db_session)
    admin = _crear_admin(db_session)
    service = ApiKeyService(db_session)
    registro, key_en_claro = service.crear(empresa.id, "Integracion Test", admin.id)
    service.revocar(empresa.id, registro.id)

    response = api_client.get("/api/v1/external/v1/clientes", headers=_headers(key_en_claro))

    assert response.status_code == 401


def test_api_key_invalida_es_rechazada(api_client, db_session):
    response = api_client.get("/api/v1/external/v1/clientes", headers=_headers("ingf_no-existe"))

    assert response.status_code == 401


def test_api_key_de_empresa_a_no_lee_cliente_de_empresa_b(api_client, db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900222222", digito_verificacion="2")
    key_a = _crear_api_key(db_session, empresa_a)
    cliente_b = _crear_cliente(db_session, empresa_b.id)

    response = api_client.get(f"/api/v1/external/v1/clientes/{cliente_b.id}", headers=_headers(key_a))

    assert response.status_code == 404


def test_api_key_puede_crear_y_listar_sus_propios_clientes(api_client, db_session):
    empresa = _crear_empresa(db_session)
    key = _crear_api_key(db_session, empresa)

    creado = api_client.post(
        "/api/v1/external/v1/clientes",
        headers=_headers(key),
        json={
            "tipo_identificacion": "13",
            "numero_identificacion": "123456789",
            "nombre": "Cliente API",
            "correo_electronico": "cliente-api@example.com",
        },
    )
    assert creado.status_code == 201, creado.text

    listado = api_client.get("/api/v1/external/v1/clientes", headers=_headers(key))
    assert listado.status_code == 200
    assert len(listado.json()) == 1
    assert listado.json()[0]["nombre"] == "Cliente API"


def test_crear_factura_con_item_embebido_crea_el_producto(api_client, db_session):
    empresa = _crear_empresa(db_session)
    key = _crear_api_key(db_session, empresa)
    cliente = _crear_cliente(db_session, empresa.id)

    response = api_client.post(
        "/api/v1/external/v1/facturas",
        headers=_headers(key),
        json={"cliente_id": str(cliente.id), "fecha": str(date.today()), "lineas": [_item_embebido()]},
    )

    assert response.status_code == 201, response.text
    productos = db_session.query(Producto).filter(Producto.empresa_id == empresa.id).all()
    assert len(productos) == 1
    assert productos[0].codigo == "EXT-001"
    assert float(productos[0].precio) == 20000


def test_crear_factura_con_codigo_repetido_actualiza_el_mismo_producto(api_client, db_session):
    empresa = _crear_empresa(db_session)
    key = _crear_api_key(db_session, empresa)
    cliente = _crear_cliente(db_session, empresa.id)

    api_client.post(
        "/api/v1/external/v1/facturas",
        headers=_headers(key),
        json={"cliente_id": str(cliente.id), "fecha": str(date.today()), "lineas": [_item_embebido()]},
    )
    api_client.post(
        "/api/v1/external/v1/facturas",
        headers=_headers(key),
        json={
            "cliente_id": str(cliente.id),
            "fecha": str(date.today()),
            "lineas": [_item_embebido(nombre="Item actualizado", precio_unitario=30000)],
        },
    )

    productos = db_session.query(Producto).filter(Producto.empresa_id == empresa.id).all()
    assert len(productos) == 1
    assert productos[0].nombre == "Item actualizado"
    assert float(productos[0].precio) == 30000


def test_enviar_factura_con_cupo_agotado_falla_409(api_client, db_session):
    empresa = _crear_empresa(db_session)
    key = _crear_api_key(db_session, empresa)
    cliente = _crear_cliente(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    _crear_suscripcion(db_session, empresa.id, max_documentos=1)

    primera = api_client.post(
        "/api/v1/external/v1/facturas",
        headers=_headers(key),
        json={"cliente_id": str(cliente.id), "fecha": str(date.today()), "lineas": [_item_embebido()]},
    ).json()
    enviada = api_client.post(
        f"/api/v1/external/v1/facturas/{primera['id']}/enviar",
        headers=_headers(key),
        json={"forma_pago": "1", "metodo_pago": "10"},
    )
    assert enviada.status_code == 200, enviada.text

    segunda = api_client.post(
        "/api/v1/external/v1/facturas",
        headers=_headers(key),
        json={"cliente_id": str(cliente.id), "fecha": str(date.today()), "lineas": [_item_embebido()]},
    ).json()

    bloqueada = api_client.post(
        f"/api/v1/external/v1/facturas/{segunda['id']}/enviar",
        headers=_headers(key),
        json={"forma_pago": "1", "metodo_pago": "10"},
    )
    assert bloqueada.status_code == 409
