from datetime import date

from src.infrastructure.db.models import (
    Cliente,
    CompanyStatus,
    Empresa,
    Factura,
    FacturaLinea,
    NotaCredito,
    NotaCreditoLinea,
    Producto,
)


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


def test_webhook_invoices_accepted_with_observations_marca_aceptada(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-inv-1b")
    factura = _crear_factura_enviada(db_session, empresa, alegra_invoice_id="inv-1b")

    response = api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={"invoice": {"id": "inv-1b", "cufe": "cufe-obs", "legalStatus": "ACCEPTED_WITH_OBSERVATIONS"}},
    )

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.estado == "aceptada"
    assert factura.cufe == "cufe-obs"


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


def test_webhook_invoices_guarda_notificaciones_dian(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-inv-2b")
    factura = _crear_factura_enviada(db_session, empresa, alegra_invoice_id="inv-2b")

    response = api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={
            "invoice": {
                "id": "inv-2b",
                "legalStatus": "REJECTED",
                "governmentResponse": {
                    "code": "89",
                    "message": "NIT no autorizado",
                    "errorMessages": ["Regla FAB10b violada"],
                },
            }
        },
    )

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.notificaciones_dian == ["Regla FAB10b violada"]


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


def _crear_nota_credito_enviada(db_session, factura, **overrides):
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
        "alegra_credit_note_id": "cn-1",
        "consecutivo": 1,
        "numero_completo": "NC-000001",
    }
    data.update(overrides)
    nota = NotaCredito(**data)
    db_session.add(nota)
    db_session.commit()
    db_session.refresh(nota)
    return nota


def test_webhook_credit_notes_marca_aceptada_y_guarda_cude(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-cn-1")
    factura = _crear_factura_enviada(db_session, empresa, alegra_invoice_id="inv-cn-1", estado="aceptada")
    nota = _crear_nota_credito_enviada(db_session, factura)

    response = api_client.post(
        "/api/v1/webhooks/alegra/credit-notes",
        json={"creditNote": {"id": "cn-1", "cude": "cude-abc", "legalStatus": "ACCEPTED"}},
    )

    assert response.status_code == 204
    db_session.refresh(nota)
    assert nota.estado == "aceptada"
    assert nota.cude == "cude-abc"
    assert nota.fecha_respuesta is not None


def test_webhook_credit_notes_marca_rechazada_con_razon_mapeada(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-cn-2")
    factura = _crear_factura_enviada(db_session, empresa, alegra_invoice_id="inv-cn-2", estado="aceptada")
    nota = _crear_nota_credito_enviada(db_session, factura, alegra_credit_note_id="cn-2")

    response = api_client.post(
        "/api/v1/webhooks/alegra/credit-notes",
        json={
            "creditNote": {
                "id": "cn-2",
                "legalStatus": "REJECTED",
                "governmentResponse": {"code": "89", "message": "NIT no autorizado"},
            }
        },
    )

    assert response.status_code == 204
    db_session.refresh(nota)
    assert nota.estado == "rechazada"
    assert "Resolucion DIAN" in nota.razon_rechazo


def test_webhook_credit_notes_aceptada_anula_la_factura_si_cubre_el_100_por_ciento(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-cn-3")
    factura = _crear_factura_enviada(db_session, empresa, alegra_invoice_id="inv-cn-3", estado="aceptada")
    producto = Producto(empresa_id=empresa.id, codigo="PROD-CN-3", nombre="Producto", precio=1000, unidad_medida="94")
    db_session.add(producto)
    db_session.commit()
    factura_linea = FacturaLinea(
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
    db_session.add(factura_linea)
    db_session.commit()
    nota = _crear_nota_credito_enviada(db_session, factura, alegra_credit_note_id="cn-3")
    linea_nota = NotaCreditoLinea(
        nota_credito_id=nota.id,
        factura_linea_id=factura_linea.id,
        descripcion="Producto",
        unidad_medida="94",
        cantidad=1,
        precio_unitario=1000,
        subtotal_linea=1000,
        impuesto_linea=0,
        total_linea=1000,
    )
    db_session.add(linea_nota)
    db_session.commit()

    response = api_client.post(
        "/api/v1/webhooks/alegra/credit-notes",
        json={"creditNote": {"id": "cn-3", "cude": "cude-3", "legalStatus": "ACCEPTED"}},
    )

    assert response.status_code == 204
    db_session.refresh(factura)
    assert factura.estado == "anulada"


def test_webhook_credit_notes_no_sobreescribe_estado_final(api_client, db_session):
    empresa = _crear_empresa(db_session, id_alegra="alegra-cn-4")
    factura = _crear_factura_enviada(db_session, empresa, alegra_invoice_id="inv-cn-4", estado="aceptada")
    nota = _crear_nota_credito_enviada(
        db_session, factura, alegra_credit_note_id="cn-4", estado="aceptada", cude="cude-original"
    )

    response = api_client.post(
        "/api/v1/webhooks/alegra/credit-notes",
        json={"creditNote": {"id": "cn-4", "cude": "cude-nuevo", "legalStatus": "REJECTED"}},
    )

    assert response.status_code == 204
    db_session.refresh(nota)
    assert nota.estado == "aceptada"
    assert nota.cude == "cude-original"


def test_webhook_credit_notes_nota_desconocida_no_falla(api_client):
    response = api_client.post(
        "/api/v1/webhooks/alegra/credit-notes",
        json={"creditNote": {"id": "cn-que-no-existe", "legalStatus": "ACCEPTED"}},
    )

    assert response.status_code == 204


def test_webhook_credit_notes_sin_id_identificable_no_falla(api_client):
    response = api_client.post("/api/v1/webhooks/alegra/credit-notes", json={"foo": "bar"})

    assert response.status_code == 204
