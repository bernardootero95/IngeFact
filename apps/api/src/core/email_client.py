import httpx

from src.core.config import get_settings

RESEND_API_URL = "https://api.resend.com/emails"


class EmailSendError(Exception):
    """El proveedor de correo (Resend) no pudo enviar el mensaje. El llamador
    siempre debe atrapar esto -- un correo que falla no debe tumbar el flujo
    principal (login, creacion de empresa, envio de factura, etc.)."""


class EmailClient:
    """Cliente delgado para la API de Resend (https://resend.com/docs/api-reference/emails/send-email)."""

    def __init__(self):
        settings = get_settings()
        self._api_key = settings.resend_api_key
        self._from = settings.email_from

    def send(
        self,
        to: str,
        subject: str,
        html: str,
        attachments: list[dict] | None = None,
    ) -> None:
        payload = {"from": self._from, "to": [to], "subject": subject, "html": html}
        if attachments:
            payload["attachments"] = attachments

        try:
            resp = httpx.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=30,
            )
        except httpx.HTTPError as exc:
            raise EmailSendError(str(exc)) from exc

        if resp.status_code >= 400:
            raise EmailSendError(f"Resend respondio {resp.status_code}: {resp.text}")
