from unittest.mock import patch

from src.core.config import get_settings
from src.core.monitoring import configure_error_monitoring


def _settings(**overrides):
    return get_settings().model_copy(update=overrides)


def test_sin_dsn_no_inicializa_sentry():
    with patch("src.core.monitoring.sentry_sdk.init") as init:
        assert configure_error_monitoring(_settings(sentry_dsn="")) is False
    init.assert_not_called()


def test_con_dsn_inicializa_sin_datos_personales_ni_cuerpos():
    dsn = "https://clave@o0.ingest.sentry.io/0"
    with patch("src.core.monitoring.sentry_sdk.init") as init:
        assert configure_error_monitoring(_settings(sentry_dsn=dsn, environment="production")) is True

    kwargs = init.call_args.kwargs
    assert kwargs["dsn"] == dsn
    assert kwargs["environment"] == "production"
    assert kwargs["send_default_pii"] is False
    assert kwargs["max_request_body_size"] == "never"
