from datetime import date, datetime, timedelta, timezone

import pytest

from src.application.reconciliacion_facturas import reconciliar_facturas_enviadas
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.infrastructure.db.models import Cliente, Empresa, Factura


class _FakeAlegraClient:
    """Responde GET /invoices/{id} segun un dict invoice_id -> respuesta (o
    excepcion). fetch_raw falla a proposito: el correo al cliente es
    best-effort y estos tests solo verifican el cambio de estado."""

    def __init__(self, respuestas: dict):
        self._respuestas = respuestas
        self.consultadas: list[str] = []

    def get_invoice(self, invoice_id: str) -> dict:
        self.consultadas.append(invoice_id)
        respuesta = self._respuestas[invoice_id]
        if isinstance(respuesta, Exception):
            raise respuesta
        return respuesta

    def fetch_raw(self, url: str) -> bytes:
        raise RuntimeError("no se descarga XML en estos tests")


@pytest.fixture
def empresa(db_session):
    empresa = Empresa(
        razon_social="Empresa Reconciliacion",
        numero_identificacion="900444444",
        digito_verificacion="1",
        correo_electronico="reconciliacion@example.com",
        estado="activo",
        id_alegra="alegra-rec",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


@pytest.fixture
def cliente(db_session, empresa):
    cliente = Cliente(
        empresa_id=empresa.id,
        tipo_identificacion="13",
        numero_identificacion="1000000001",
        nombre="Cliente reconciliacion",
        correo_electronico="cliente-rec@example.com",
    )
    db_session.add(cliente)
    db_session.commit()
    return cliente


def _factura(db_session, empresa, cliente, invoice_id, *, estado="enviada", hace=timedelta(hours=1)):
    factura = Factura(
        empresa_id=empresa.id,
        cliente_id=cliente.id,
        fecha=date.today(),
        estado=estado,
        subtotal=1000,
        total_impuestos=0,
        total=1000,
        alegra_invoice_id=invoice_id,
        consecutivo=1,
        numero_completo=f"SETP-{invoice_id}",
        fecha_envio=datetime.now(timezone.utc) - hace,
    )
    db_session.add(factura)
    db_session.commit()
    db_session.refresh(factura)
    return factura


def _invoice(legal_status, **extra):
    return {"invoice": {"legalStatus": legal_status, **extra}, "files": {}}


def test_marca_aceptada_y_completa_cufe_y_qr(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-a")
    alegra = _FakeAlegraClient({"inv-a": _invoice("ACCEPTED", cufe="cufe-a", qrCodeContent="qr-a")})

    resultado = reconciliar_facturas_enviadas(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "aceptada"
    assert factura.cufe == "cufe-a"
    assert factura.qr_code_content == "qr-a"
    assert factura.fecha_respuesta is not None
    assert resultado.aceptadas == 1


def test_accepted_with_observations_cuenta_como_aceptada(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-obs")
    alegra = _FakeAlegraClient({"inv-obs": _invoice("ACCEPTED_WITH_OBSERVATIONS", cufe="cufe-obs")})

    reconciliar_facturas_enviadas(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "aceptada"


def test_marca_rechazada_con_razon_mapeada(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-r")
    alegra = _FakeAlegraClient(
        {"inv-r": _invoice("REJECTED", governmentResponse={"code": "89", "message": "NIT no autorizado"})}
    )

    resultado = reconciliar_facturas_enviadas(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "rechazada"
    assert "Resolucion DIAN" in factura.razon_rechazo
    assert resultado.rechazadas == 1


def test_sin_legal_status_final_la_deja_en_enviada(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-p")
    alegra = _FakeAlegraClient({"inv-p": _invoice(None)})

    resultado = reconciliar_facturas_enviadas(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "enviada"
    assert resultado.sin_resolver == 1


def test_error_de_alegra_no_detiene_las_demas(db_session, empresa, cliente):
    con_error = _factura(db_session, empresa, cliente, "inv-e1")
    transitoria = _factura(db_session, empresa, cliente, "inv-e2")
    buena = _factura(db_session, empresa, cliente, "inv-ok")
    alegra = _FakeAlegraClient(
        {
            "inv-e1": AlegraApiError(404, {"message": "Not Found"}),
            "inv-e2": AlegraTransientError("timeout"),
            "inv-ok": _invoice("ACCEPTED", cufe="cufe-ok"),
        }
    )

    resultado = reconciliar_facturas_enviadas(db_session, alegra)

    for factura in (con_error, transitoria, buena):
        db_session.refresh(factura)
    assert con_error.estado == "enviada"
    assert transitoria.estado == "enviada"
    assert buena.estado == "aceptada"
    assert len(resultado.errores) == 2
    assert resultado.aceptadas == 1


def test_ignora_estados_finales_y_envios_recientes(db_session, empresa, cliente):
    _factura(db_session, empresa, cliente, "inv-final", estado="aceptada")
    reciente = _factura(db_session, empresa, cliente, "inv-reciente", hace=timedelta(minutes=2))
    alegra = _FakeAlegraClient({})

    resultado = reconciliar_facturas_enviadas(db_session, alegra)

    assert alegra.consultadas == []
    assert resultado.revisadas == 0
    db_session.refresh(reciente)
    assert reciente.estado == "enviada"


def test_filtra_por_empresa(db_session, empresa, cliente):
    otra = Empresa(
        razon_social="Otra empresa",
        numero_identificacion="900555555",
        digito_verificacion="1",
        correo_electronico="otra@example.com",
        estado="activo",
        id_alegra="alegra-otra",
    )
    db_session.add(otra)
    db_session.commit()
    otro_cliente = Cliente(
        empresa_id=otra.id,
        tipo_identificacion="13",
        numero_identificacion="1000000002",
        nombre="Cliente otra",
        correo_electronico="cliente-otra@example.com",
    )
    db_session.add(otro_cliente)
    db_session.commit()
    _factura(db_session, otra, otro_cliente, "inv-otra")
    _factura(db_session, empresa, cliente, "inv-mia")
    alegra = _FakeAlegraClient({"inv-mia": _invoice("ACCEPTED")})

    # Sin notificacion: el correo al cliente tambien hace GET /invoices (para el XML).
    reconciliar_facturas_enviadas(db_session, alegra, empresa_id=empresa.id, notificar_clientes=False)

    assert alegra.consultadas == ["inv-mia"]
