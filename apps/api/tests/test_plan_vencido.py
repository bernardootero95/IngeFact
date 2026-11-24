import io
from datetime import date, timedelta

from openpyxl import load_workbook

from src.application.auth_service import AuthService
from src.core.security import hash_password
from src.core.tiempo import hoy_colombia
from src.domain.estado_plan import SIN_CUPO, SIN_PLAN, VENCIDO, VIGENTE, calcular_estado_plan
from src.infrastructure.db.models import (
    Cliente,
    Empresa,
    EventoReceptor,
    FacturaRecibida,
    Producto,
    Suscripcion,
    UsuarioEmpresa,
)

HOY = date(2026, 11, 23)
CLIENTE_NUEVO = {
    "tipo_identificacion": "13",
    "numero_identificacion": "1000000001",
    "nombre": "Cliente nuevo",
    "correo_electronico": "nuevo@example.com",
}


def test_estado_plan_vencido_manda_sobre_sin_cupo():
    assert calcular_estado_plan(HOY - timedelta(days=1), 10, 10, HOY) == VENCIDO
    assert calcular_estado_plan(HOY - timedelta(days=1), 10, 0, HOY) == VENCIDO


def test_estado_plan_sin_cupo_vigente_y_sin_plan():
    assert calcular_estado_plan(HOY, 10, 10, HOY) == SIN_CUPO
    assert calcular_estado_plan(HOY, 10, 9, HOY) == VIGENTE
    assert calcular_estado_plan(None, None, None, HOY) == SIN_PLAN


def _empresa_con_tenant(db_session, *, fecha_fin: date, max_documentos: int = 10) -> tuple[Empresa, str]:
    empresa = Empresa(
        razon_social="Empresa Vencida SAS",
        numero_identificacion="900618467",
        digito_verificacion="4",
        correo_electronico="empresa@example.com",
        estado="activo",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.add(
        Suscripcion(
            empresa_id=empresa.id,
            max_documentos=max_documentos,
            fecha_inicio=fecha_fin - timedelta(days=30),
            fecha_fin=fecha_fin,
            estado="activa",
        )
    )
    db_session.add(
        UsuarioEmpresa(
            empresa_id=empresa.id,
            nombre="Tenant",
            email="tenant@ingefact.test",
            password_hash=hash_password("Sandbox123!"),
            estado="activo",
        )
    )
    db_session.commit()
    token = AuthService(db_session).login_tenant("tenant@ingefact.test", "Sandbox123!").access_token
    return empresa, token


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_plan_vencido_bloquea_escrituras_con_403(api_client, db_session):
    _, token = _empresa_con_tenant(db_session, fecha_fin=hoy_colombia() - timedelta(days=5))

    respuesta = api_client.post("/api/v1/tenant/clientes", json=CLIENTE_NUEVO, headers=_auth(token))

    assert respuesta.status_code == 403
    assert respuesta.headers["X-IngeFact-Error"] == "PLAN_VENCIDO"
    assert "venció" in respuesta.json()["detail"]


def test_plan_vencido_permite_lecturas(api_client, db_session):
    _, token = _empresa_con_tenant(db_session, fecha_fin=hoy_colombia() - timedelta(days=5))

    empresa = api_client.get("/api/v1/tenant/empresa", headers=_auth(token))
    clientes = api_client.get("/api/v1/tenant/clientes", headers=_auth(token))

    assert empresa.status_code == 200
    assert empresa.json()["suscripcion"]["estado_plan"] == VENCIDO
    assert clientes.status_code == 200


def test_plan_vigente_no_bloquea_escrituras(api_client, db_session):
    _, token = _empresa_con_tenant(db_session, fecha_fin=hoy_colombia())

    respuesta = api_client.post("/api/v1/tenant/clientes", json=CLIENTE_NUEVO, headers=_auth(token))

    assert respuesta.status_code == 201


def test_plan_sin_cupo_sigue_permitiendo_escrituras(api_client, db_session):
    _, token = _empresa_con_tenant(db_session, fecha_fin=hoy_colombia() + timedelta(days=30), max_documentos=0)

    empresa = api_client.get("/api/v1/tenant/empresa", headers=_auth(token))
    respuesta = api_client.post("/api/v1/tenant/clientes", json=CLIENTE_NUEVO, headers=_auth(token))

    assert empresa.json()["suscripcion"]["estado_plan"] == SIN_CUPO
    assert respuesta.status_code == 201


def test_suscripcion_informa_dias_para_vencer(api_client, db_session):
    _, token = _empresa_con_tenant(db_session, fecha_fin=hoy_colombia() + timedelta(days=12))

    suscripcion = api_client.get("/api/v1/tenant/empresa", headers=_auth(token)).json()["suscripcion"]

    assert suscripcion["dias_para_vencer"] == 12
    assert suscripcion["estado_plan"] == VIGENTE


def test_exportar_excel_con_plan_vencido(api_client, db_session):
    empresa, token = _empresa_con_tenant(db_session, fecha_fin=hoy_colombia() - timedelta(days=5))
    db_session.add(
        Cliente(
            empresa_id=empresa.id,
            tipo_identificacion="13",
            numero_identificacion="1000000000",
            nombre="Cliente Uno",
            correo_electronico="uno@example.com",
        )
    )
    db_session.add(
        Producto(empresa_id=empresa.id, tipo="bien", codigo="P-1", nombre="Producto Uno", precio=1000,
                 unidad_medida="94")
    )
    recibida = FacturaRecibida(
        empresa_id=empresa.id, proveedor_nombre="Proveedor SAS", proveedor_nit="900000001", cufe="cufe-1",
        fecha=date(2026, 10, 1),
    )
    db_session.add(recibida)
    db_session.commit()
    db_session.add_all(
        [
            EventoReceptor(factura_recibida_id=recibida.id, tipo="030", numero="EV-1", origen="ingefact"),
            EventoReceptor(factura_recibida_id=recibida.id, tipo="033", numero="EV-2", origen="dian"),
        ]
    )
    db_session.commit()

    respuesta = api_client.get("/api/v1/tenant/exportacion/excel", headers=_auth(token))

    assert respuesta.status_code == 200
    assert "ingefact-900618467-" in respuesta.headers["content-disposition"]
    libro = load_workbook(io.BytesIO(respuesta.content))
    assert libro.sheetnames == [
        "Facturas", "Detalle facturas", "Notas crédito", "Notas débito", "Documentos soporte", "Nómina",
        "Eventos facturas compra", "Clientes", "Proveedores", "Empleados", "Productos",
    ]
    assert libro["Clientes"]["D2"].value == "Cliente Uno"
    assert libro["Productos"]["C2"].value == "Producto Uno"
    eventos = list(libro["Eventos facturas compra"].iter_rows(min_row=2, values_only=True))
    assert len(eventos) == 1  # solo el enviado desde IngeFact
    assert eventos[0][1] == "Acuse de recibo"


def test_exportar_excel_no_incluye_datos_de_otra_empresa(api_client, db_session):
    _, token = _empresa_con_tenant(db_session, fecha_fin=hoy_colombia())
    otra = Empresa(razon_social="Otra", numero_identificacion="900618468", digito_verificacion="2", estado="activo")
    db_session.add(otra)
    db_session.commit()
    db_session.add(
        Cliente(empresa_id=otra.id, tipo_identificacion="13", numero_identificacion="1", nombre="Ajeno",
                correo_electronico="a@example.com")
    )
    db_session.commit()

    respuesta = api_client.get("/api/v1/tenant/exportacion/excel", headers=_auth(token))

    libro = load_workbook(io.BytesIO(respuesta.content))
    assert libro["Clientes"].max_row == 1
