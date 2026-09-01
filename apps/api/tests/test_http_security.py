"""
Pruebas a nivel HTTP real (via TestClient) de las 2 garantias de seguridad
mas criticas del sistema: que el aislamiento multi-tenant y las guardas de
admin efectivamente bloquean en la capa de FastAPI (HTTPBearer + JWT +
dependencias de auth), no solo en la logica de los *Service.

Hasta antes de este archivo, las pruebas de rutas invocaban la funcion
Python del endpoint directamente pasando `tenant`/`db` a mano, lo que
bypaseaba por completo la verificacion del token -- ver hallazgo de la
auditoria de 2026-08-31.
"""

from datetime import date

import pytest

from src.core.security import hash_password
from src.infrastructure.db.models import Cliente, Empresa, Factura, Producto, UsuarioAdmin, UsuarioEmpresa


@pytest.fixture
def empresa_a(db_session):
    empresa = Empresa(
        razon_social="Empresa A",
        numero_identificacion="900111111",
        digito_verificacion="1",
        correo_electronico="empresa-a@example.com",
        estado="activo",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    usuario = UsuarioEmpresa(
        empresa_id=empresa.id,
        nombre="Usuario A",
        email="usuario-a@example.com",
        password_hash=hash_password("ClaveTenantA123!"),
        estado="activo",
    )
    db_session.add(usuario)
    db_session.commit()

    cliente = Cliente(
        empresa_id=empresa.id,
        tipo_identificacion="CC",
        numero_identificacion="123456789",
        nombre="Cliente de Empresa A",
        correo_electronico="cliente-a@example.com",
        estado="activo",
    )
    db_session.add(cliente)
    db_session.commit()
    db_session.refresh(cliente)

    producto = Producto(
        empresa_id=empresa.id, codigo="PROD-A", nombre="Producto de Empresa A", precio=1000, unidad_medida="94"
    )
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)

    factura = Factura(
        empresa_id=empresa.id,
        cliente_id=cliente.id,
        fecha=date.today(),
        estado="borrador",
        subtotal=1000,
        total_impuestos=0,
        total=1000,
    )
    db_session.add(factura)
    db_session.commit()
    db_session.refresh(factura)

    return empresa, cliente, producto, factura


@pytest.fixture
def empresa_b(db_session):
    empresa = Empresa(
        razon_social="Empresa B",
        numero_identificacion="900222222",
        digito_verificacion="2",
        correo_electronico="empresa-b@example.com",
        estado="activo",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    usuario = UsuarioEmpresa(
        empresa_id=empresa.id,
        nombre="Usuario B",
        email="usuario-b@example.com",
        password_hash=hash_password("ClaveTenantB123!"),
        estado="activo",
    )
    db_session.add(usuario)
    db_session.commit()

    return empresa


@pytest.fixture
def admin_user(db_session):
    user = UsuarioAdmin(
        nombre="Staff Test",
        email="staff-http@example.com",
        password_hash=hash_password("ClaveAdmin123!"),
        rol="admin",
        estado="activo",
    )
    db_session.add(user)
    db_session.commit()
    return user


def _login(api_client, email, password, *, admin=False):
    path = "/api/v1/auth/admin/login" if admin else "/api/v1/auth/login"
    response = api_client.post(path, json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_tenant_token_cannot_call_admin_routes(api_client, empresa_a):
    token = _login(api_client, "usuario-a@example.com", "ClaveTenantA123!")

    response = api_client.get("/api/v1/admin/usuarios", headers=_auth_headers(token))

    assert response.status_code == 403


def test_admin_route_without_token_is_rejected(api_client, admin_user):
    response = api_client.get("/api/v1/admin/usuarios")

    assert response.status_code == 401


def test_tenant_route_without_token_is_rejected(api_client, empresa_a):
    response = api_client.get("/api/v1/tenant/clientes")

    assert response.status_code == 401


def test_tampered_jwt_is_rejected(api_client, empresa_a):
    token = _login(api_client, "usuario-a@example.com", "ClaveTenantA123!")
    tampered = token[:-1] + ("A" if token[-1] != "A" else "B")

    response = api_client.get("/api/v1/tenant/clientes", headers=_auth_headers(tampered))

    assert response.status_code == 401


def test_tenant_cannot_read_another_tenants_cliente(api_client, empresa_a, empresa_b):
    _empresa_a, cliente_a, _producto_a, _factura_a = empresa_a
    token_b = _login(api_client, "usuario-b@example.com", "ClaveTenantB123!")

    response = api_client.get(
        f"/api/v1/tenant/clientes/{cliente_a.id}", headers=_auth_headers(token_b)
    )

    # 404, no 403 -- el tenant B ni siquiera debe poder confirmar que ese id existe.
    assert response.status_code == 404


def test_tenant_can_read_its_own_cliente(api_client, empresa_a):
    _empresa, cliente, _producto, _factura = empresa_a
    token_a = _login(api_client, "usuario-a@example.com", "ClaveTenantA123!")

    response = api_client.get(
        f"/api/v1/tenant/clientes/{cliente.id}", headers=_auth_headers(token_a)
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(cliente.id)


def test_tenant_cannot_read_another_tenants_factura(api_client, empresa_a, empresa_b):
    _empresa_a, _cliente_a, _producto_a, factura_a = empresa_a
    token_b = _login(api_client, "usuario-b@example.com", "ClaveTenantB123!")

    response = api_client.get(
        f"/api/v1/tenant/facturas/{factura_a.id}", headers=_auth_headers(token_b)
    )

    assert response.status_code == 404


def test_tenant_cannot_send_another_tenants_factura(api_client, empresa_a, empresa_b):
    _empresa_a, _cliente_a, _producto_a, factura_a = empresa_a
    token_b = _login(api_client, "usuario-b@example.com", "ClaveTenantB123!")

    response = api_client.post(
        f"/api/v1/tenant/facturas/{factura_a.id}/enviar",
        json={"forma_pago": "1", "metodo_pago": "10"},
        headers=_auth_headers(token_b),
    )

    assert response.status_code == 404


def test_tenant_can_read_its_own_factura(api_client, empresa_a):
    _empresa, _cliente, _producto, factura = empresa_a
    token_a = _login(api_client, "usuario-a@example.com", "ClaveTenantA123!")

    response = api_client.get(
        f"/api/v1/tenant/facturas/{factura.id}", headers=_auth_headers(token_a)
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(factura.id)


def test_admin_token_can_call_admin_routes(api_client, admin_user):
    token = _login(api_client, "staff-http@example.com", "ClaveAdmin123!", admin=True)

    response = api_client.get("/api/v1/admin/usuarios", headers=_auth_headers(token))

    assert response.status_code == 200
