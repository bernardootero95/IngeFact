from datetime import date

from src.infrastructure.db.models import Cliente, CompanyStatus, Empresa, Factura, Producto


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


def _crear_factura_enviada(db_session, empresa, **overrides):
    cliente = Cliente(
        empresa_id=empresa.id,
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        nombre="Cliente webhook",
        correo_electronico="cliente-webhook@example.com",
    )
    db_session.add(cliente)
    producto = Producto(
        empresa_id=empresa.id, codigo="PROD-001", nombre="Producto webhook", precio=1000, unidad_medida="94"
    )
    db_session.add(producto)
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
    }
    data.update(overrides)
    factura = Factura(**data)
    db_session.add(factura)
    db_session.commit()
    db_session.refresh(factura)
    return factura


def test_webhook_invoices_marca_aceptada_y_guarda_cufe(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-inv-1")
    factura = _crear_factura_enviada(db_session, empresa)

    response = api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={"invoice": {"id": "inv-1", "cufe": "cufe-abc", "legalStatus": "ACCEPTED"}},
    )

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.estado == "aceptada"
    assert factura.cufe == "cufe-abc"
    assert factura.fecha_respuesta is not None


def test_webhook_invoices_marca_rechazada_con_razon_mapeada(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-inv-2")
    factura = _crear_factura_enviada(db_session, empresa, alegra_invoice_id="inv-2")

    response = api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={
            "invoice": {
                "id": "inv-2",
                "legalStatus": "REJECTED",
                "governmentResponse": {"code": "89", "message": "NIT no autorizado"},
            }
        },
    )

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.estado == "rechazada"
    assert "Resolucion DIAN" in factura.razon_rechazo


def test_webhook_invoices_no_sobreescribe_estado_final(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-inv-3")
    factura = _crear_factura_enviada(
        db_session, empresa, alegra_invoice_id="inv-3", estado="aceptada", cufe="cufe-original"
    )

    response = api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={"invoice": {"id": "inv-3", "cufe": "cufe-nuevo", "legalStatus": "REJECTED"}},
    )

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.estado == "aceptada"
    assert factura.cufe == "cufe-original"


def test_webhook_invoices_factura_desconocida_no_falla(api_client):
    response = api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={"invoice": {"id": "inv-que-no-existe", "legalStatus": "ACCEPTED"}},
    )

    assert response.status_code == 204


def test_webhook_invoices_sin_id_identificable_no_falla(api_client):
    response = api_client.post("/api/v1/webhooks/alegra/invoices", json={"foo": "bar"})

    assert response.status_code == 204
