import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.config import get_settings  # noqa: E402
from src.core.rate_limit import limiter  # noqa: E402
from src.infrastructure.db import models  # noqa: E402,F401
from src.infrastructure.db.session import Base, get_db  # noqa: E402
from src.main import app  # noqa: E402

TEST_DATABASE_URL = get_settings().database_url.rsplit("/", 1)[0] + "/ingefact_test"

# Modulos de src/application que importan EmailClient -- se agregan aqui a
# medida que mas servicios envian correo, para que ningun test golpee la red
# real de Resend por construir un EmailClient() default sin querer.
_MODULOS_CON_EMAIL_CLIENT = ("src.application.auth_service", "src.application.empresa_service")


class FakeEmailClient:
    """Nunca golpea la red -- registra los correos "enviados" para poder
    inspeccionarlos en el test, mismo patron que FakeAlegraClient."""

    def __init__(self, fail: bool = False):
        self.fail = fail
        self.sent = []

    def send(self, to, subject, html, attachments=None):
        from src.core.email_client import EmailSendError

        if self.fail:
            raise EmailSendError("fallo simulado de Resend")
        self.sent.append({"to": to, "subject": subject, "html": html, "attachments": attachments})


@pytest.fixture(autouse=True)
def _no_real_emails(monkeypatch):
    """Parchea la clase EmailClient en cada modulo que la usa, para que toda
    instancia creada sin `email_client` explicito (el default de cada
    servicio) use un fake en memoria en vez de llamar a Resend de verdad."""
    for modulo in _MODULOS_CON_EMAIL_CLIENT:
        monkeypatch.setattr(f"{modulo}.EmailClient", FakeEmailClient)


@pytest.fixture
def fake_email_client():
    return FakeEmailClient()

_engine = create_engine(TEST_DATABASE_URL)
_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture(scope="session", autouse=True)
def _setup_test_database():
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def db_session():
    session = _TestSessionLocal()
    try:
        yield session
    finally:
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
        session.close()


@pytest.fixture
def api_client(db_session):
    """TestClient real -- ejercita el stack HTTP completo (JWT, dependencias
    de auth, CORS), a diferencia de instanciar los *Service directamente."""

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    limiter.reset()
    try:
        yield TestClient(app)
    finally:
        limiter.reset()
        app.dependency_overrides.pop(get_db, None)
