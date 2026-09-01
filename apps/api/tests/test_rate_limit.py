import pytest
from fastapi.testclient import TestClient

from src.core.rate_limit import limiter
from src.infrastructure.db.session import get_db
from src.main import app


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    limiter.reset()
    try:
        yield TestClient(app)
    finally:
        limiter.reset()
        app.dependency_overrides.pop(get_db, None)


def test_login_is_rate_limited_after_repeated_attempts(client):
    payload = {"email": "no-existe@example.com", "password": "clave-incorrecta"}

    responses = [client.post("/api/v1/auth/login", json=payload) for _ in range(6)]

    assert [r.status_code for r in responses[:5]] == [401] * 5
    assert responses[5].status_code == 429


def test_forgot_password_is_rate_limited_after_repeated_attempts(client):
    payload = {"email": "no-existe@example.com"}

    responses = [client.post("/api/v1/auth/forgot-password", json=payload) for _ in range(4)]

    assert [r.status_code for r in responses[:3]] == [204] * 3
    assert responses[3].status_code == 429
