from src.application.empresa_service import CreateEmpresaAlegraService
from src.core.alegra_webhooks import HEADER_TOKEN, construir_config_webhooks, token_valido, webhooks_configurados
from src.core.config import get_settings
from src.domain.empresa import CrearEmpresaRequest


def _settings(**cambios):
    return get_settings().model_copy(update=cambios)


def test_config_registra_general_y_los_cinco_tipos_con_el_header_secreto():
    config = construir_config_webhooks(
        _settings(api_public_url="https://api.ingefact.com/", alegra_webhook_secret="s3cr3t")
    )

    assert config["general"]["governmentStatusChanged"]["url"] == (
        "https://api.ingefact.com/api/v1/webhooks/alegra/general"
    )
    rutas = {
        "invoices": "invoices",
        "creditNotes": "credit-notes",
        "debitNotes": "debit-notes",
        "payrolls": "payrolls",
        "supportDocuments": "support-documents",
    }
    for clave, ruta in rutas.items():
        entrada = config[clave]["emissionFinished"]
        assert entrada["url"] == f"https://api.ingefact.com/api/v1/webhooks/alegra/{ruta}"
        assert entrada["headers"] == {HEADER_TOKEN: "s3cr3t"}
        assert entrada["status"] == "active"


def test_webhooks_configurados_exige_url_y_secreto():
    assert not webhooks_configurados(_settings(api_public_url="", alegra_webhook_secret="x"))
    assert not webhooks_configurados(_settings(api_public_url="https://api.ingefact.com", alegra_webhook_secret=""))
    assert webhooks_configurados(_settings(api_public_url="https://api.ingefact.com", alegra_webhook_secret="x"))


def test_token_valido():
    con_secreto = _settings(alegra_webhook_secret="abc")
    assert token_valido("abc", con_secreto)
    assert not token_valido("abd", con_secreto)
    assert not token_valido(None, con_secreto)
    assert token_valido(None, _settings(alegra_webhook_secret="", environment="development"))
    assert not token_valido(None, _settings(alegra_webhook_secret="", environment="production"))


def _request() -> CrearEmpresaRequest:
    return CrearEmpresaRequest(
        razon_social="Empresa Webhooks SAS",
        numero_identificacion="900559088",
        digito_verificacion="2",
        tipo_identificacion="31",
        correo_electronico="webhooks@example.com",
        nombre_usuario="Usuario Webhooks",
    )


def test_crear_empresa_incluye_webhooks_si_estan_configurados(monkeypatch):
    settings = _settings(api_public_url="https://api.ingefact.com", alegra_webhook_secret="s3cr3t")
    monkeypatch.setattr("src.core.alegra_webhooks.get_settings", lambda: settings)

    payload = CreateEmpresaAlegraService._build_alegra_payload(_request())

    assert payload["webhooks"]["invoices"]["emissionFinished"]["headers"] == {HEADER_TOKEN: "s3cr3t"}


def test_crear_empresa_sin_configuracion_no_manda_webhooks(monkeypatch):
    settings = _settings(api_public_url="", alegra_webhook_secret="")
    monkeypatch.setattr("src.core.alegra_webhooks.get_settings", lambda: settings)

    payload = CreateEmpresaAlegraService._build_alegra_payload(_request())

    assert "webhooks" not in payload
