from datetime import date, datetime, timedelta, timezone

import pytest

from src.application.reconciliacion_documentos import reconciliar_documentos_enviados
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.infrastructure.db.models import (
    Cliente,
    DocumentoSoporte,
    Empleado,
    Empresa,
    Factura,
    FacturaLinea,
    Nomina,
    NotaCredito,
    NotaCreditoLinea,
    NotaDebito,
    Producto,
    Proveedor,
)

HACE_UNA_HORA = timedelta(hours=1)


class _FakeAlegraClient:
    """Todos los GET responden segun un dict id -> respuesta (o excepcion).
    fetch_raw falla a proposito: el correo al cliente/proveedor es
    best-effort y estos tests solo verifican el cambio de estado."""

    def __init__(self, respuestas: dict):
        self._respuestas = respuestas
        self.consultados: list[str] = []

    def _get(self, id_: str) -> dict:
        self.consultados.append(id_)
        respuesta = self._respuestas[id_]
        if isinstance(respuesta, Exception):
            raise respuesta
        return respuesta

    get_invoice = get_credit_note = get_debit_note = get_payroll = get_support_document = _get

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


def _guardar(db_session, documento):
    db_session.add(documento)
    db_session.commit()
    db_session.refresh(documento)
    return documento


def _factura(db_session, empresa, cliente, invoice_id, *, estado="enviada", hace=HACE_UNA_HORA):
    return _guardar(
        db_session,
        Factura(
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
        ),
    )


def _datos_nota(factura, **extra):
    return {
        "empresa_id": factura.empresa_id,
        "factura_id": factura.id,
        "cliente_id": factura.cliente_id,
        "fecha": date.today(),
        "motivo_codigo": "1",
        "estado": "enviada",
        "subtotal": 1000,
        "total_impuestos": 0,
        "total": 1000,
        "consecutivo": 1,
        "fecha_envio": datetime.now(timezone.utc) - HACE_UNA_HORA,
        **extra,
    }


def _respuesta(clave, legal_status, **extra):
    return {clave: {"legalStatus": legal_status, **extra}, "files": {}}


def _reconciliar(db_session, alegra, **kwargs):
    kwargs.setdefault("notificar_clientes", False)
    return reconciliar_documentos_enviados(db_session, alegra, **kwargs)


# --- Facturas -----------------------------------------------------------------


def test_factura_aceptada_completa_cufe_y_qr(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-a")
    alegra = _FakeAlegraClient({"inv-a": _respuesta("invoice", "ACCEPTED", cufe="cufe-a", qrCodeContent="qr-a")})

    resultados = _reconciliar(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "aceptada"
    assert factura.cufe == "cufe-a"
    assert factura.qr_code_content == "qr-a"
    assert factura.fecha_respuesta is not None
    assert resultados["facturas"].aceptados == 1


def test_factura_accepted_with_observations_cuenta_como_aceptada(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-obs")
    alegra = _FakeAlegraClient({"inv-obs": _respuesta("invoice", "ACCEPTED_WITH_OBSERVATIONS", cufe="cufe-obs")})

    _reconciliar(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "aceptada"


def test_factura_rechazada_con_razon_mapeada(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-r")
    alegra = _FakeAlegraClient(
        {"inv-r": _respuesta("invoice", "REJECTED", governmentResponse={"code": "89", "message": "NIT no autorizado"})}
    )

    resultados = _reconciliar(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "rechazada"
    assert "Resolucion DIAN" in factura.razon_rechazo
    assert resultados["facturas"].rechazados == 1


def test_sin_legal_status_final_la_deja_en_enviada(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-p")
    alegra = _FakeAlegraClient({"inv-p": _respuesta("invoice", None)})

    resultados = _reconciliar(db_session, alegra)

    db_session.refresh(factura)
    assert factura.estado == "enviada"
    assert resultados["facturas"].sin_resolver == 1


def test_error_de_alegra_no_detiene_los_demas(db_session, empresa, cliente):
    con_error = _factura(db_session, empresa, cliente, "inv-e1")
    transitoria = _factura(db_session, empresa, cliente, "inv-e2")
    buena = _factura(db_session, empresa, cliente, "inv-ok")
    alegra = _FakeAlegraClient(
        {
            "inv-e1": AlegraApiError(404, {"message": "Not Found"}),
            "inv-e2": AlegraTransientError("timeout"),
            "inv-ok": _respuesta("invoice", "ACCEPTED", cufe="cufe-ok"),
        }
    )

    resultados = _reconciliar(db_session, alegra)

    for factura in (con_error, transitoria, buena):
        db_session.refresh(factura)
    assert con_error.estado == "enviada"
    assert transitoria.estado == "enviada"
    assert buena.estado == "aceptada"
    assert len(resultados["facturas"].errores) == 2
    assert resultados["facturas"].aceptados == 1


def test_ignora_estados_finales_y_envios_recientes(db_session, empresa, cliente):
    _factura(db_session, empresa, cliente, "inv-final", estado="aceptada")
    reciente = _factura(db_session, empresa, cliente, "inv-reciente", hace=timedelta(minutes=2))
    alegra = _FakeAlegraClient({})

    resultados = _reconciliar(db_session, alegra)

    assert alegra.consultados == []
    assert resultados["facturas"].revisados == 0
    db_session.refresh(reciente)
    assert reciente.estado == "enviada"


def test_filtra_por_empresa(db_session, empresa, cliente):
    otra = _guardar(
        db_session,
        Empresa(
            razon_social="Otra empresa",
            numero_identificacion="900555555",
            digito_verificacion="1",
            correo_electronico="otra@example.com",
            estado="activo",
            id_alegra="alegra-otra",
        ),
    )
    otro_cliente = _guardar(
        db_session,
        Cliente(
            empresa_id=otra.id,
            tipo_identificacion="13",
            numero_identificacion="1000000002",
            nombre="Cliente otra",
            correo_electronico="cliente-otra@example.com",
        ),
    )
    _factura(db_session, otra, otro_cliente, "inv-otra")
    _factura(db_session, empresa, cliente, "inv-mia")
    alegra = _FakeAlegraClient({"inv-mia": _respuesta("invoice", "ACCEPTED")})

    _reconciliar(db_session, alegra, empresa_id=empresa.id)

    assert alegra.consultados == ["inv-mia"]


# --- Notas Credito / Debito ---------------------------------------------------


def test_nota_credito_aceptada_por_el_100_por_ciento_anula_la_factura(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-nc", estado="aceptada")
    producto = _guardar(
        db_session, Producto(empresa_id=empresa.id, codigo="P-NC", nombre="Producto", precio=1000, unidad_medida="94")
    )
    linea_factura = _guardar(
        db_session,
        FacturaLinea(
            factura_id=factura.id,
            producto_id=producto.id,
            descripcion="Producto",
            unidad_medida="94",
            cantidad=1,
            precio_unitario=1000,
            subtotal_linea=1000,
            impuesto_linea=0,
            total_linea=1000,
        ),
    )
    nota = _guardar(db_session, NotaCredito(**_datos_nota(factura, alegra_credit_note_id="cn-1")))
    _guardar(
        db_session,
        NotaCreditoLinea(
            nota_credito_id=nota.id,
            factura_linea_id=linea_factura.id,
            descripcion="Producto",
            unidad_medida="94",
            cantidad=1,
            precio_unitario=1000,
            subtotal_linea=1000,
            impuesto_linea=0,
            total_linea=1000,
        ),
    )
    alegra = _FakeAlegraClient({"cn-1": _respuesta("creditNote", "ACCEPTED", cude="cude-1")})

    resultados = _reconciliar(db_session, alegra)

    db_session.refresh(nota)
    db_session.refresh(factura)
    assert nota.estado == "aceptada"
    assert nota.cude == "cude-1"
    assert factura.estado == "anulada"
    assert resultados["notas_credito"].aceptados == 1


def test_nota_debito_rechazada(db_session, empresa, cliente):
    factura = _factura(db_session, empresa, cliente, "inv-nd", estado="aceptada")
    nota = _guardar(db_session, NotaDebito(**_datos_nota(factura, alegra_debit_note_id="dn-1")))
    alegra = _FakeAlegraClient(
        {"dn-1": _respuesta("debitNote", "REJECTED", governmentResponse={"code": "89", "message": "x"})}
    )

    resultados = _reconciliar(db_session, alegra)

    db_session.refresh(nota)
    assert nota.estado == "rechazada"
    assert resultados["notas_debito"].rechazados == 1


# --- Nomina -------------------------------------------------------------------


def _nomina(db_session, empresa, payroll_id):
    empleado = _guardar(
        db_session,
        Empleado(
            empresa_id=empresa.id,
            tipo_documento="13",
            numero_documento="10123456",
            primer_apellido="Perez",
            primer_nombre="Ana",
            tipo_trabajador="01",
            subtipo_trabajador="00",
            tipo_contrato="1",
            sueldo=1_500_000,
            lugar_trabajo_municipio="11001",
            lugar_trabajo_direccion="Calle 1",
            fecha_ingreso=date(2026, 1, 1),
        ),
    )
    return _guardar(
        db_session,
        Nomina(
            empresa_id=empresa.id,
            empleado_id=empleado.id,
            periodo_nomina="5",
            fecha_liquidacion_inicio=date(2026, 6, 1),
            fecha_liquidacion_fin=date(2026, 6, 30),
            fecha_pago=["2026-06-30"],
            forma_pago="1",
            metodo_pago="10",
            devengados={},
            deducciones={},
            estado="enviada",
            alegra_payroll_id=payroll_id,
            fecha_envio=datetime.now(timezone.utc) - HACE_UNA_HORA,
        ),
    )


def test_nomina_aceptada_guarda_cune_y_firma(db_session, empresa):
    nomina = _nomina(db_session, empresa, "pr-1")
    alegra = _FakeAlegraClient(
        {"pr-1": _respuesta("payroll", "ACCEPTED", cune="cune-1", signatureValue="firma-1")}
    )

    resultados = _reconciliar(db_session, alegra)

    db_session.refresh(nomina)
    assert nomina.estado == "aceptada"
    assert nomina.cune == "cune-1"
    assert nomina.firma_digital == "firma-1"
    assert resultados["nominas"].aceptados == 1


# --- Documento Soporte ----------------------------------------------------------


def test_documento_soporte_usa_estados_en_masculino(db_session, empresa):
    proveedor = _guardar(
        db_session,
        Proveedor(
            empresa_id=empresa.id,
            tipo_identificacion="31",
            numero_identificacion="900777777",
            nombre="Proveedor",
            correo_electronico="proveedor@example.com",
        ),
    )
    pendiente = _guardar(
        db_session,
        DocumentoSoporte(
            empresa_id=empresa.id,
            proveedor_id=proveedor.id,
            fecha=date.today(),
            estado="enviado",
            alegra_support_document_id="ds-1",
            fecha_envio=datetime.now(timezone.utc) - HACE_UNA_HORA,
        ),
    )
    alegra = _FakeAlegraClient({"ds-1": _respuesta("supportDocument", "ACCEPTED", cuds="cuds-1")})

    resultados = _reconciliar(db_session, alegra)

    db_session.refresh(pendiente)
    assert pendiente.estado == "aceptado"
    assert pendiente.cuds == "cuds-1"
    assert resultados["documentos_soporte"].aceptados == 1
