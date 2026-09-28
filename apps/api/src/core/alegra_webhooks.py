"""Configuracion de los webhooks de Alegra.

Hallazgo real (2026-09-28): en produccion nunca llego un solo webhook porque
IngeFact nunca los registraba -- en Alegra se configuran POR EMPRESA, dentro
del bloque `webhooks` de POST/PATCH /companies (confirmado contra
https://e-provider-docs.alegra.com/reference/updatecompany). Sin ellos, un
documento que la DIAN no resolvia en la respuesta sincrona quedaba en
'enviada' para siempre.

Alegra no firma los webhooks; la unica forma de autenticarlos que ofrece es
reenviar headers propios que definimos al registrarlos. Por eso se registra
un secreto compartido en HEADER_TOKEN, y ademas el receptor nunca confia en
el contenido del payload (re-consulta el documento a Alegra, ver
reconciliacion_documentos.reconciliar_documento).
"""

import hmac

from src.core.config import Settings, get_settings

HEADER_TOKEN = "X-IngeFact-Webhook-Token"

# Evento de Alegra -> ruta de este API (presentation/routes/webhooks.py).
# equivalentDocuments no se registra: IngeFact no emite documentos equivalentes.
RUTAS_EMISSION_FINISHED = {
    "invoices": "invoices",
    "creditNotes": "credit-notes",
    "debitNotes": "debit-notes",
    "payrolls": "payrolls",
    "supportDocuments": "support-documents",
}


def webhooks_configurados(settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    return bool(settings.api_public_url and settings.alegra_webhook_secret)


def construir_config_webhooks(settings: Settings | None = None) -> dict:
    """Bloque `webhooks` para POST/PATCH /companies."""
    settings = settings or get_settings()
    base = f"{settings.api_public_url.rstrip('/')}/api/v1/webhooks/alegra"
    headers = {HEADER_TOKEN: settings.alegra_webhook_secret}

    def entrada(ruta: str) -> dict:
        return {"url": f"{base}/{ruta}", "headers": headers, "status": "active"}

    config = {"general": {"governmentStatusChanged": entrada("general")}}
    for clave, ruta in RUTAS_EMISSION_FINISHED.items():
        config[clave] = {"emissionFinished": entrada(ruta)}
    return config


def token_valido(token_recibido: str | None, settings: Settings | None = None) -> bool:
    """Sin secreto configurado solo se acepta fuera de production (dev y
    tests); en production eso significaria aceptar webhooks de cualquiera."""
    settings = settings or get_settings()
    if not settings.alegra_webhook_secret:
        return settings.environment != "production"
    return hmac.compare_digest(token_recibido or "", settings.alegra_webhook_secret)
