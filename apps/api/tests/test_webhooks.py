from src.infrastructure.db.models import CompanyStatus, Empresa


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


def test_webhook_invoices_solo_recibe_y_no_falla(api_client):
    response = api_client.post(
        "/api/v1/webhooks/alegra/invoices",
        json={"invoice": {"id": "inv-1"}, "legalStatus": "ACCEPTED"},
    )

    assert response.status_code == 204
