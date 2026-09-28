from datetime import date, datetime, timezone

import pytest

from src.core.alegra_client import AlegraTransientError
from src.core.alegra_webhooks import HEADER_TOKEN
from src.core.config import get_settings
from src.infrastructure.db.models import (
    Cliente,
    CompanyStatus,
    Empresa,
    Factura,
    FacturaLinea,
    HabilitacionDian,
    NotaCredito,
    NotaCreditoLinea,
    NotaDebito,
    Producto,
)
from src.main import app
from src.presentation.routes.webhooks import get_alegra_client


class _NoOpAlegraClient:
    """notificar_factura_aceptada pide el XML a Alegra para armar el correo
    al cliente -- sin un fake, eso golpearia el sandbox real en cada test.
    Falla a proposito; el correo es best-effort y estos tests solo
    verifican el cambio de estado."""

    def get_invoice(self, invoice_id):
        raise RuntimeError("AlegraClient real no debe llamarse en tests")

    def fetch_raw(self, url):
        raise RuntimeError("AlegraClient real no debe llamarse en tests")


class _HabilitacionAlegraClient:
    def get_company(self, company_id):
        return {"id": company_id, "governmentStatus": {"invoices": "AUTHORIZED"}}


class _FakeAlegraClient:
    """Lo que 'Alegra' responde al GET que hace el webhook -- la unica fuente
    de verdad del estado, nunca el payload recibido."""

    def __init__(self):
        self.respuestas: dict = {}
        self.consultados: list[str] = []

    def _get(self, id_):
        self.consultados.append(id_)
        respuesta = self.respuestas[id_]
        if isinstance(respuesta, Exception):
            raise respuesta
        return respuesta

    get_invoice = get_credit_note = get_debit_note = get_payroll = get_support_document = _get

    def fetch_raw(self, url):
        raise RuntimeError("no se descarga XML en estos tests")


@pytest.fixture(autouse=True)
def _no_real_alegra(monkeypatch):
    monkeypatch.setattr("src.application.factura_service.AlegraClient", _NoOpAlegraClient)
    monkeypatch.setattr("src.application.habilitacion_dian_service.AlegraClient", _HabilitacionAlegraClient)


@pytest.fixture
def alegra():
    fake = _FakeAlegraClient()
    app.dependency_overrides[get_alegra_client] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_alegra_client, None)


def _crear_empresa(db_session, *, id_alegra):
    empresa = Empresa(
        razon_social="Empresa Webhook Test",
        numero_identificacion="900333333",
        digito_verificacion="1",
        correo_electronico="webhook-test@example.com",
        estado="activo",
        id_alegra=id_alegra,
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_factura(db_session, empresa, **overrides):
    cliente = Cliente(
        empresa_id=empresa.id,
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        nombre="Cliente webhook",
        correo_electronico="cliente-webhook@example.com",
    )
    db_session.add(cliente)
    db_session.commit()

    data = {
        "empresa_id": empresa.id,
        "cliente_id": cliente.id,
        "fecha": date.today(),
        "estado": "enviada",
        "subtotal": 1000,
        "total_impuestos": 0,
        "total": 1000,
        "alegra_invoice_id": "inv-1",
        "consecutivo": 1,
        "numero_completo": "SETP1",
        "fecha_envio": datetime.now(timezone.utc),
    }
    data.update(overrides)
    factura = Factura(**data)
    db_session.add(factura)
    db_session.commit()
    db_session.refresh(factura)
    return factura


def _crear_nota(db_session, modelo, factura, **overrides):
    data = {
        "empresa_id": factura.empresa_id,
        "factura_id": factura.id,
        "cliente_id": factura.cliente_id,
        "fecha": date.today(),
        "motivo_codigo": "1",
        "estado": "enviada",
        "subtotal": 1000,
        "total_impuestos": 0,
        "total": 1000,
        "consecutivo": 1,
        "fecha_envio": datetime.now(timezone.utc),
    }
    data.update(overrides)
    nota = modelo(**data)
    db_session.add(nota)
    db_session.commit()
    db_session.refresh(nota)
    return nota


# --- general.governmentStatusChanged ---------------------------------------------


def test_webhook_general_actualiza_estado_de_empresa_conocida(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-123")

    response = api_client.post(
        "/api/v1/webhooks/alegra/general",
        json={"company": {"id": "alegra-123"}, "governmentStatus": "ACCEPTED"},
    )

    assert response.status_code == 204
    registros = db_session.query(CompanyStatus).filter(CompanyStatus.empresa_id == empresa.id).all()
    assert len(registros) == 1
    assert registros[0].estado == "government_status_changed"
    habilitaciones = {
        h.tipo: h.estado
        for h in db_session.query(HabilitacionDian).filter(HabilitacionDian.empresa_id == empresa.id)
    }
    assert habilitaciones == {"facturacion": "habilitada", "nomina": "no_habilitada"}


def test_webhook_general_ignora_empresa_desconocida_sin_error(api_client, db_session):
    response = api_client.post(
        "/api/v1/webhooks/alegra/general",
        json={"company": {"id": "id-alegra-que-no-existe"}},
    )

    assert response.status_code == 204
    assert db_session.query(CompanyStatus).count() == 0


def test_webhook_general_sin_id_identificable_no_falla(api_client):
    response = api_client.post("/api/v1/webhooks/alegra/general", json={"foo": "bar"})

    assert response.status_code == 204


# --- Autenticacion por header secreto --------------------------------------------


@pytest.fixture
def con_secreto(monkeypatch):
    settings = get_settings().model_copy(update={"alegra_webhook_secret": "secreto-test"})
    monkeypatch.setattr("src.core.alegra_webhooks.get_settings", lambda: settings)
    return "secreto-test"


def test_con_secreto_configurado_rechaza_webhook_sin_token(api_client, con_secreto):
    response = api_client.post("/api/v1/webhooks/alegra/invoices", json={"invoice": {"id": "x"}})

    assert response.status_code == 401


def test_con_secreto_configurado_rechaza_token_incorrecto(api_client, con_secreto):
    response = api_client.post(
        "/api/v1/webhooks/alegra/general", json={"foo": "bar"}, headers={HEADER_TOKEN: "otro"}
    )

    assert response.status_code == 401


def test_con_secreto_configurado_acepta_token_correcto(api_client, con_secreto):
    response = api_client.post(
        "/api/v1/webhooks/alegra/general", json={"foo": "bar"}, headers={HEADER_TOKEN: con_secreto}
    )

    assert response.status_code == 204


def test_en_production_sin_secreto_rechaza_todo(api_client, monkeypatch):
    settings = get_settings().model_copy(update={"environment": "production", "alegra_webhook_secret": ""})
    monkeypatch.setattr("src.core.alegra_webhooks.get_settings", lambda: settings)

    response = api_client.post("/api/v1/webhooks/alegra/general", json={"foo": "bar"})

    assert response.status_code == 401


# --- emissionFinished: el estado sale del GET a Alegra, no del payload ---------


def test_factura_aceptada_segun_alegra(api_client, db_session, alegra):
    factura = _crear_factura(db_session, _crear_empresa(db_session, id_alegra="e-1"))
    alegra.respuestas["inv-1"] = {"invoice": {"id": "inv-1", "legalStatus": "ACCEPTED", "cufe": "cufe-abc"}}

    response = api_client.post("/api/v1/webhooks/alegra/invoices", json={"invoice": {"id": "inv-1"}})

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.estado == "aceptada"
    assert factura.cufe == "cufe-abc"
    assert alegra.consultados[0] == "inv-1"


def test_payload_falso_no_cambia_el_estado(api_client, db_session, alegra):
    """Un tercero que conozca la URL manda ACCEPTED, pero Alegra dice que la
    DIAN aun no responde: la factura sigue en 'enviada'."""
    factura = _crear_factura(db_session, _crear_empresa(db_session, id_alegra="e-2"))
    alegra.respuestas["inv-1"] = {"invoice": {"id": "inv-1", "legalStatus": None}}

    api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={"invoice": {"id": "inv-1", "legalStatus": "ACCEPTED", "cufe": "cufe-falso"}},
    )

    db_session.refresh(factura)
    assert factura.estado == "enviada"
    assert factura.cufe is None


def test_factura_rechazada_con_razon_mapeada(api_client, db_session, alegra):
    factura = _crear_factura(db_session, _crear_empresa(db_session, id_alegra="e-3"))
    alegra.respuestas["inv-1"] = {
        "invoice": {
            "id": "inv-1",
            "legalStatus": "REJECTED",
            "governmentResponse": {
                "code": "89",
                "message": "NIT no autorizado",
                "errorMessages": ["Regla FAB10b violada"],
            },
        }
    }

    api_client.post("/api/v1/webhooks/alegra/invoices", json={"invoice": {"id": "inv-1"}})

    db_session.refresh(factura)
    assert factura.estado == "rechazada"
    assert "Resolucion DIAN" in factura.razon_rechazo
    assert factura.notificaciones_dian == ["Regla FAB10b violada"]


def test_no_toca_documentos_en_estado_final(api_client, db_session, alegra):
    factura = _crear_factura(
        db_session, _crear_empresa(db_session, id_alegra="e-4"), estado="aceptada", cufe="cufe-original"
    )

    response = api_client.post("/api/v1/webhooks/alegra/invoices", json={"invoice": {"id": "inv-1"}})

    assert response.status_code == 204
    assert alegra.consultados == []
    db_session.refresh(factura)
    assert factura.cufe == "cufe-original"


def test_error_de_alegra_responde_204_y_deja_pendiente(api_client, db_session, alegra):
    factura = _crear_factura(db_session, _crear_empresa(db_session, id_alegra="e-5"))
    alegra.respuestas["inv-1"] = AlegraTransientError("timeout")

    response = api_client.post("/api/v1/webhooks/alegra/invoices", json={"invoice": {"id": "inv-1"}})

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.estado == "enviada"


def test_documento_desconocido_o_sin_id_no_falla(api_client, alegra):
    assert api_client.post("/api/v1/webhooks/alegra/invoices", json={"invoice": {"id": "no-existe"}}).status_code == 204
    assert api_client.post("/api/v1/webhooks/alegra/invoices", json={"foo": "bar"}).status_code == 204
    assert alegra.consultados == []


def test_nota_credito_al_100_por_ciento_anula_la_factura(api_client, db_session, alegra):
    empresa = _crear_empresa(db_session, id_alegra="e-cn")
    factura = _crear_factura(db_session, empresa, estado="aceptada")
    producto = Producto(empresa_id=empresa.id, codigo="PROD-CN", nombre="Producto", precio=1000, unidad_medida="94")
    db_session.add(producto)
    db_session.commit()
    linea_factura = FacturaLinea(
        factura_id=factura.id,
        producto_id=producto.id,
        descripcion="Producto",
        unidad_medida="94",
        cantidad=1,
        precio_unitario=1000,
        subtotal_linea=1000,
        impuesto_linea=0,
        total_linea=1000,
    )
    db_session.add(linea_factura)
    db_session.commit()
    nota = _crear_nota(db_session, NotaCredito, factura, alegra_credit_note_id="cn-1")
    db_session.add(
        NotaCreditoLinea(
            nota_credito_id=nota.id,
            factura_linea_id=linea_factura.id,
            descripcion="Producto",
            unidad_medida="94",
            cantidad=1,
            precio_unitario=1000,
            subtotal_linea=1000,
            impuesto_linea=0,
            total_linea=1000,
        )
    )
    db_session.commit()
    alegra.respuestas["cn-1"] = {"creditNote": {"id": "cn-1", "legalStatus": "ACCEPTED", "cude": "cude-1"}}

    api_client.post("/api/v1/webhooks/alegra/credit-notes", json={"creditNote": {"id": "cn-1"}})

    db_session.refresh(nota)
    db_session.refresh(factura)
    assert nota.estado == "aceptada"
    assert nota.cude == "cude-1"
    assert factura.estado == "anulada"


def test_nota_debito_aceptada(api_client, db_session, alegra):
    factura = _crear_factura(db_session, _crear_empresa(db_session, id_alegra="e-dn"), estado="aceptada")
    nota = _crear_nota(db_session, NotaDebito, factura, alegra_debit_note_id="dn-1")
    alegra.respuestas["dn-1"] = {"debitNote": {"id": "dn-1", "legalStatus": "ACCEPTED", "cude": "cude-dn"}}

    api_client.post("/api/v1/webhooks/alegra/debit-notes", json={"debitNote": {"id": "dn-1"}})

    db_session.refresh(nota)
    assert nota.estado == "aceptada"
    assert nota.cude == "cude-dn"


def test_rutas_nuevas_de_nomina_y_documento_soporte_responden(api_client, alegra):
    for ruta, payload in (
        ("payrolls", {"payroll": {"id": "no-existe"}}),
        ("support-documents", {"supportDocument": {"id": "no-existe"}}),
    ):
        assert api_client.post(f"/api/v1/webhooks/alegra/{ruta}", json=payload).status_code == 204
