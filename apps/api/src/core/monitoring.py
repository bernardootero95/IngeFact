import sentry_sdk

from src.core.config import Settings


def configure_error_monitoring(settings: Settings) -> bool:
    """Activa el reporte de errores a Sentry (o GlitchTip, mismo SDK y DSN).

    Sin SENTRY_DSN no hace nada -- dev y tests quedan igual. Solo se reportan
    excepciones no manejadas y respuestas 5xx (default de la integracion de
    FastAPI); los 4xx son errores de validacion del usuario, no fallos.
    """
    if not settings.sentry_dsn:
        return False

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        # Las facturas llevan datos fiscales de clientes de los tenants (NIT,
        # nombres, correos): nunca salen del servidor hacia un tercero. El
        # stack trace y la ruta bastan para diagnosticar.
        send_default_pii=False,
        max_request_body_size="never",
    )
    return True
