import time

import httpx

from src.core.config import get_settings

RESEND_API_URL = "https://api.resend.com/emails"

# Resend limita por cuenta (10 req/s) -- un cliente de la API externa que
# emite facturas en paralelo lo supera facilmente. Un 429 es transitorio:
# se reintenta respetando `retry-after` antes de darse por vencido.
# Igual un fallo al *conectar* (DNS, red del contenedor): la peticion nunca
# llego a Resend, asi que reintentar no puede duplicar el correo. Un timeout
# de lectura NO se reintenta -- el correo pudo haberse enviado ya.
MAX_INTENTOS = 3
ESPERA_MAXIMA_SEGUNDOS = 5.0


class EmailSendError(Exception):
    """El proveedor de correo (Resend) no pudo enviar el mensaje. El llamador
    siempre debe atrapar esto -- un correo que falla no debe tumbar el flujo
    principal (login, creacion de empresa, envio de factura, etc.)."""


class _ErrorConexion(Exception):
    """Fallo al conectar con Resend; seguro de reintentar (uso interno)."""


def _segundos_espera(resp: httpx.Response, intento: int) -> float:
    """`retry-after` de Resend si viene y es valido; si no, backoff 1s, 2s..."""
    try:
        segundos = float(resp.headers.get("retry-after", ""))
    except ValueError:
        segundos = float(2 ** (intento - 1))
    return min(max(segundos, 0.0), ESPERA_MAXIMA_SEGUNDOS)


class EmailClient:
    """Cliente delgado para la API de Resend (https://resend.com/docs/api-reference/emails/send-email)."""

    def __init__(self, sleep=time.sleep):
        settings = get_settings()
        self._api_key = settings.resend_api_key
        self._from = settings.email_from
        self._sleep = sleep

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

        for intento in range(1, MAX_INTENTOS + 1):
            try:
                resp = self._post(payload)
            except _ErrorConexion as exc:
                if intento == MAX_INTENTOS:
                    raise EmailSendError(str(exc)) from exc
                self._sleep(float(2 ** (intento - 1)))
                continue
            if resp.status_code != 429 or intento == MAX_INTENTOS:
                break
            self._sleep(_segundos_espera(resp, intento))

        if resp.status_code >= 400:
            raise EmailSendError(f"Resend respondio {resp.status_code}: {resp.text}")

    def _post(self, payload: dict) -> httpx.Response:
        try:
            return httpx.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=30,
            )
        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            raise _ErrorConexion(str(exc)) from exc
        except httpx.HTTPError as exc:
            raise EmailSendError(str(exc)) from exc
