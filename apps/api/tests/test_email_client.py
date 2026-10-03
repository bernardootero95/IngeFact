import httpx
import pytest

from src.core import email_client as modulo
from src.core.email_client import EmailClient, EmailSendError


def _respuesta(status: int, headers: dict | None = None) -> httpx.Response:
    return httpx.Response(status, headers=headers or {}, text="{}")


@pytest.fixture
def respuestas(monkeypatch):
    """Cola de respuestas que devolvera httpx.post, en orden."""
    cola: list[httpx.Response] = []
    llamadas: list[dict] = []

    def fake_post(url, **kwargs):
        llamadas.append(kwargs)
        return cola.pop(0)

    monkeypatch.setattr(modulo.httpx, "post", fake_post)
    return cola, llamadas


def _cliente(esperas: list[float]) -> EmailClient:
    return EmailClient(sleep=esperas.append)


def test_envio_exitoso_no_reintenta(respuestas):
    cola, llamadas = respuestas
    cola.append(_respuesta(200))
    esperas: list[float] = []

    _cliente(esperas).send(to="a@b.co", subject="s", html="<p/>")

    assert len(llamadas) == 1
    assert esperas == []


def test_429_reintenta_respetando_retry_after(respuestas):
    cola, llamadas = respuestas
    cola.extend([_respuesta(429, {"retry-after": "1"}), _respuesta(200)])
    esperas: list[float] = []

    _cliente(esperas).send(to="a@b.co", subject="s", html="<p/>")

    assert len(llamadas) == 2
    assert esperas == [1.0]


def test_429_sin_retry_after_usa_backoff(respuestas):
    cola, _ = respuestas
    cola.extend([_respuesta(429), _respuesta(429), _respuesta(200)])
    esperas: list[float] = []

    _cliente(esperas).send(to="a@b.co", subject="s", html="<p/>")

    assert esperas == [1.0, 2.0]


def test_retry_after_excesivo_se_acota(respuestas):
    cola, _ = respuestas
    cola.extend([_respuesta(429, {"retry-after": "3600"}), _respuesta(200)])
    esperas: list[float] = []

    _cliente(esperas).send(to="a@b.co", subject="s", html="<p/>")

    assert esperas == [modulo.ESPERA_MAXIMA_SEGUNDOS]


def test_429_persistente_falla_tras_agotar_intentos(respuestas):
    cola, llamadas = respuestas
    cola.extend([_respuesta(429)] * modulo.MAX_INTENTOS)
    esperas: list[float] = []

    with pytest.raises(EmailSendError, match="429"):
        _cliente(esperas).send(to="a@b.co", subject="s", html="<p/>")

    assert len(llamadas) == modulo.MAX_INTENTOS
    assert len(esperas) == modulo.MAX_INTENTOS - 1


def test_otro_error_no_reintenta(respuestas):
    cola, llamadas = respuestas
    cola.append(_respuesta(422))
    esperas: list[float] = []

    with pytest.raises(EmailSendError, match="422"):
        _cliente(esperas).send(to="a@b.co", subject="s", html="<p/>")

    assert len(llamadas) == 1
    assert esperas == []


def test_error_de_red_se_traduce(monkeypatch):
    def falla(url, **kwargs):
        raise httpx.ConnectError("sin red")

    monkeypatch.setattr(modulo.httpx, "post", falla)

    with pytest.raises(EmailSendError, match="sin red"):
        _cliente([]).send(to="a@b.co", subject="s", html="<p/>")
