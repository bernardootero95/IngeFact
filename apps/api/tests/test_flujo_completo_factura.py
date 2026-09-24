"""
Test de integracion de flujo completo, a nivel HTTP real (via `api_client`,
TestClient + JWT real), encadenando varios servicios en una sola prueba:
login tenant -> crear cliente -> crear producto -> crear factura borrador ->
enviar -> queda aceptada, con el consecutivo real incrementado.

Hasta este archivo, cada test cubria un servicio/ruta aislado (ver
`test_factura_service.py`, `test_cliente_service.py`, etc.) o solo las guardas
de seguridad HTTP (`test_http_security.py`) -- ninguno verificaba la cadena de
estados REAL entre servicios (consecutivo DIAN, cupo de suscripcion, snapshot
de producto en la linea) pasando por la capa HTTP completa. Ese es el gap real
que este archivo cierra -- no reemplaza los tests aislados, los complementa.
"""

from datetime import date

from src.core.security import hash_password
from src.infrastructure.db.models import Empresa, ResolucionDian, Suscripcion, UsuarioEmpresa


class _FakeAlegraClientAceptada:
    """Zero-arg, como exige el monkeypatch de la clase AlegraClient dentro de
    factura_service (mismo patron que `_no_real_emails` en conftest.py) --
    siempre devuelve una respuesta ACCEPTED, no necesita configurarse por test."""

    def create_invoice(self, payload: dict) -> dict:
        return {
            "invoice": {
                "id": "inv-e2e-1",
                "cufe": "cufe-e2e-1",
                "fullNumber": "SETP1",
                "legalStatus": "ACCEPTED",
            }
        }

    def get_invoice(self, invoice_id: str) -> dict:
        return {"invoice": {"files": {}}}


def _login(api_client, email: str, password: str) -> str:
    response = api_client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_flujo_completo_login_cliente_producto_factura_enviar_aceptada(db_session, api_client, monkeypatch):
    monkeypatch.setattr("src.application.factura_service.AlegraClient", _FakeAlegraClientAceptada)

    empresa = Empresa(
        razon_social="Empresa Flujo Completo SAS",
        numero_identificacion="900900900",
        digito_verificacion="1",
        correo_electronico="flujo-completo@example.com",
        estado="activo",
        id_alegra="alegra-empresa-flujo-completo",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    usuario = UsuarioEmpresa(
        empresa_id=empresa.id,
        nombre="Usuario Flujo Completo",
        email="usuario-flujo-completo@example.com",
        password_hash=hash_password("ClaveFlujoCompleto123!"),
        estado="activo",
    )
    db_session.add(usuario)

    resolucion = ResolucionDian(
        empresa_id=empresa.id,
        numero_resolucion="18760000001",
        prefijo="SETP",
        rango_minimo=1,
        rango_maximo=1000,
        fecha_inicio=date(2026, 1, 1),
        fecha_fin=date(2030, 1, 1),
        technical_key="fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        consecutivo_actual=1,
    )
    db_session.add(resolucion)

    suscripcion = Suscripcion(
        empresa_id=empresa.id,
        max_documentos=1000,
        fecha_inicio=date(2026, 1, 1),
        fecha_fin=date(2030, 1, 1),
        estado="activa",
    )
    db_session.add(suscripcion)
    db_session.commit()

    token = _login(api_client, "usuario-flujo-completo@example.com", "ClaveFlujoCompleto123!")
    headers = {"Authorization": f"Bearer {token}"}

    cliente_response = api_client.post(
        "/api/v1/tenant/clientes",
        json={
            "tipo_identificacion": "13",
            "numero_identificacion": "1000000001",
            "nombre": "Cliente de prueba E2E",
            "correo_electronico": "cliente-e2e@example.com",
        },
        headers=headers,
    )
    assert cliente_response.status_code == 201, cliente_response.text
    cliente_id = cliente_response.json()["id"]

    producto_response = api_client.post(
        "/api/v1/tenant/productos",
        json={
            "codigo": "PROD-E2E-001",
            "nombre": "Producto de prueba E2E",
            "precio": 100000,
            "unidad_medida": "94",
            "tributo": "01",
            "tarifa_impuesto": 19,
        },
        headers=headers,
    )
    assert producto_response.status_code == 201, producto_response.text
    producto_id = producto_response.json()["id"]

    factura_response = api_client.post(
        "/api/v1/tenant/facturas",
        json={
            "cliente_id": cliente_id,
            "fecha": date.today().isoformat(),
            "lineas": [{"producto_id": producto_id, "cantidad": 2}],
        },
        headers=headers,
    )
    assert factura_response.status_code == 201, factura_response.text
    factura = factura_response.json()
    assert factura["estado"] == "borrador"
    assert factura["consecutivo"] is None
    assert float(factura["total"]) == 238000
    factura_id = factura["id"]

    enviar_response = api_client.post(
        f"/api/v1/tenant/facturas/{factura_id}/enviar",
        json={"forma_pago": "1", "metodo_pago": "10"},
        headers=headers,
    )
    assert enviar_response.status_code == 200, enviar_response.text
    factura_enviada = enviar_response.json()

    assert factura_enviada["estado"] == "aceptada"
    assert factura_enviada["cufe"] == "cufe-e2e-1"
    # El primer numero realmente asignado es rango_minimo (1) -- bug real
    # corregido 2026-09-24, antes se saltaba al 2.
    assert factura_enviada["consecutivo"] == 1
    assert factura_enviada["numero_completo"] == "SETP1"

    db_session.refresh(resolucion)
    assert resolucion.consecutivo_actual == 2

    detalle_response = api_client.get(f"/api/v1/tenant/facturas/{factura_id}", headers=headers)
    assert detalle_response.status_code == 200
    assert detalle_response.json()["estado"] == "aceptada"
