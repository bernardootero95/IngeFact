from datetime import date

import pytest
from fastapi import HTTPException

from src.application.factura_service import FacturaService
from src.application.nota_debito_service import NotaDebitoService
from src.core.alegra_client import AlegraApiError
from src.domain.factura import CrearFacturaRequest, LineaFacturaRequest
from src.domain.nota_debito import ActualizarNotaDebitoRequest, CrearNotaDebitoRequest, LineaNotaDebitoRequest
from src.infrastructure.db.models import Cliente, Empresa, Producto


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
        "id_alegra": "alegra-empresa-1",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_cliente(db_session, empresa_id, **overrides) -> Cliente:
    data = {
        "empresa_id": empresa_id,
        "tipo_identificacion": "13",
        "numero_identificacion": "1000000000",
        "nombre": "Cliente de prueba",
        "correo_electronico": "cliente@example.com",
    }
    data.update(overrides)
    cliente = Cliente(**data)
    db_session.add(cliente)
    db_session.commit()
    db_session.refresh(cliente)
    return cliente


def _crear_producto(db_session, empresa_id, **overrides) -> Producto:
    data = {
        "empresa_id": empresa_id,
        "codigo": "PROD-001",
        "nombre": "Producto de prueba",
        "precio": 100000,
        "unidad_medida": "94",
        "tributo": "01",
        "tarifa_impuesto": 19,
    }
    data.update(overrides)
    producto = Producto(**data)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


class _FakeAlegraClient:
    def __init__(self):
        self.invoice_response: dict = {
            "invoice": {"id": "inv-1", "cufe": "cufe-factura-1", "fullNumber": "SETP1", "legalStatus": "ACCEPTED"}
        }
        self.debit_note_response: dict | None = None
        self.debit_note_error: AlegraApiError | None = None
        self.last_debit_note_payload: dict | None = None
        self.raw_response: bytes = b""

    def create_invoice(self, payload: dict) -> dict:
        return self.invoice_response

    def create_debit_note(self, payload: dict) -> dict:
        self.last_debit_note_payload = payload
        if self.debit_note_error:
            raise self.debit_note_error
        return self.debit_note_response or {}

    def get_debit_note(self, debit_note_id: str) -> dict:
        if self.debit_note_error:
            raise self.debit_note_error
        return self.debit_note_response or {}

    def fetch_raw(self, url: str) -> bytes:
        if self.debit_note_error:
            raise self.debit_note_error
        return self.raw_response


def _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2):
    from src.infrastructure.db.models import ResolucionDian, Suscripcion

    resolucion = db_session.query(ResolucionDian).filter(ResolucionDian.empresa_id == empresa.id).one_or_none()
    if resolucion is None:
        resolucion = ResolucionDian(
            empresa_id=empresa.id,
            numero_resolucion="18760000001",
            prefijo="SETP",
            rango_minimo=1,
            rango_maximo=1000,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2030, 1, 1),
            technical_key="fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
            consecutivo_actual=1,
        )
        db_session.add(resolucion)
        db_session.commit()

    suscripcion = (
        db_session.query(Suscripcion)
        .filter(Suscripcion.empresa_id == empresa.id, Suscripcion.estado == "activa")
        .one_or_none()
    )
    if suscripcion is None:
        suscripcion = Suscripcion(
            empresa_id=empresa.id,
            max_documentos=1000,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2030, 1, 1),
            estado="activa",
        )
        db_session.add(suscripcion)
        db_session.commit()

    factura_service = FacturaService(db_session, alegra_client=fake)
    factura = factura_service.crear_borrador(
        empresa.id,
        CrearFacturaRequest(
            cliente_id=cliente.id,
            fecha=date.today(),
            lineas=[LineaFacturaRequest(producto_id=producto.id, cantidad=cantidad)],
        ),
    )
    return factura_service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")


def _nota_payload(factura_linea_id, cantidad=1, motivo_codigo="1") -> CrearNotaDebitoRequest:
    return CrearNotaDebitoRequest(
        motivo_codigo=motivo_codigo, lineas=[LineaNotaDebitoRequest(factura_linea_id=factura_linea_id, cantidad=cantidad)]
    )


def test_crear_borrador_calcula_totales_y_no_asigna_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    service = NotaDebitoService(db_session, alegra_client=fake)

    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))

    assert nota.estado == "borrador"
    assert nota.consecutivo is None
    assert nota.numero_completo is None
    assert float(nota.subtotal) == 100000
    assert float(nota.total_impuestos) == 19000
    assert float(nota.total) == 119000


def test_crear_borrador_sobre_factura_no_aceptada_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura_service = FacturaService(db_session, alegra_client=fake)
    borrador = factura_service.crear_borrador(
        empresa.id,
        CrearFacturaRequest(cliente_id=cliente.id, fecha=date.today(), lineas=[LineaFacturaRequest(producto_id=producto.id, cantidad=1)]),
    )
    service = NotaDebitoService(db_session, alegra_client=fake)

    with pytest.raises(HTTPException) as exc_info:
        service.crear_borrador(empresa.id, borrador.id, _nota_payload(borrador.lineas[0].id))
    assert exc_info.value.status_code == 409


def test_crear_borrador_no_limita_cantidad_a_lo_disponible(db_session):
    """A diferencia de NotaCredito, una nota debito agrega un cargo -- no
    hay tope de "disponibilidad" contra la cantidad original de la linea."""
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=1)
    service = NotaDebitoService(db_session, alegra_client=fake)

    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=50))

    assert float(nota.lineas[0].cantidad) == 50


def test_actualizar_borrador_reemplaza_lineas_y_recalcula(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))

    actualizada = service.actualizar_borrador(
        empresa.id,
        nota.id,
        ActualizarNotaDebitoRequest(
            motivo_codigo="2", lineas=[LineaNotaDebitoRequest(factura_linea_id=factura.lineas[0].id, cantidad=2)]
        ),
    )

    assert actualizada.motivo_codigo == "2"
    assert float(actualizada.total) == 238000


def test_eliminar_borrador_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))

    service.eliminar_borrador(empresa.id, nota.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, nota.id)


def test_enviar_incrementa_consecutivo_propio_y_marca_aceptada(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.debit_note_response = {
        "debitNote": {"id": "dn-1", "cude": "cude-1", "legalStatus": "ACCEPTED", "qrCodeContent": "NumFac: 1"}
    }
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))

    enviada = service.enviar(empresa.id, nota.id)

    assert enviada.estado == "aceptada"
    assert enviada.cude == "cude-1"
    assert enviada.consecutivo == 1
    assert enviada.numero_completo == "ND-000001"


def test_consecutivo_no_choca_con_notas_credito(db_session):
    """ConsecutivoNota es compartido con NotaCreditoService pero
    particionado por `tipo` -- una nota debito no debe heredar/consumir el
    contador de las notas credito de la misma empresa."""
    from src.application.nota_credito_service import NotaCreditoService
    from src.domain.nota_credito import CrearNotaCreditoRequest, LineaNotaCreditoRequest

    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)

    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-cn", "legalStatus": "ACCEPTED"}}
    fake.create_credit_note = lambda payload: fake.credit_note_response
    credito_service = NotaCreditoService(db_session, alegra_client=fake)
    nota_credito = credito_service.crear_borrador(
        empresa.id, factura.id, CrearNotaCreditoRequest(motivo_codigo="1", lineas=[LineaNotaCreditoRequest(factura_linea_id=factura.lineas[0].id, cantidad=1)])
    )
    credito_service.enviar(empresa.id, nota_credito.id)

    fake.debit_note_response = {"debitNote": {"id": "dn-1", "cude": "cude-dn", "legalStatus": "ACCEPTED"}}
    debito_service = NotaDebitoService(db_session, alegra_client=fake)
    nota_debito = debito_service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))
    enviada = debito_service.enviar(empresa.id, nota_debito.id)

    assert enviada.consecutivo == 1
    assert enviada.numero_completo == "ND-000001"


def test_enviar_rechazada_guarda_razon_mapeada(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.debit_note_response = {
        "debitNote": {
            "id": "dn-1",
            "legalStatus": "REJECTED",
            "governmentResponse": {"code": "89", "message": "NIT no autorizado"},
        }
    }
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))

    enviada = service.enviar(empresa.id, nota.id)

    assert enviada.estado == "rechazada"
    assert "Resolucion DIAN" in enviada.razon_rechazo


def test_editar_nota_rechazada_la_vuelve_a_borrador_y_permite_reenviar(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.debit_note_response = {"debitNote": {"id": "dn-1", "legalStatus": "REJECTED"}}
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))
    rechazada = service.enviar(empresa.id, nota.id)
    assert rechazada.estado == "rechazada"

    corregida = service.actualizar_borrador(
        empresa.id,
        nota.id,
        ActualizarNotaDebitoRequest(
            motivo_codigo="4", lineas=[LineaNotaDebitoRequest(factura_linea_id=factura.lineas[0].id, cantidad=1)]
        ),
    )
    assert corregida.estado == "borrador"
    assert corregida.consecutivo is None

    fake.debit_note_response = {"debitNote": {"id": "dn-2", "cude": "cude-aceptada", "legalStatus": "ACCEPTED"}}
    reenviada = service.enviar(empresa.id, nota.id)

    assert reenviada.estado == "aceptada"
    assert reenviada.cude == "cude-aceptada"
    assert reenviada.consecutivo == 2


def test_enviar_error_alegra_se_mapea_502(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.debit_note_error = AlegraApiError(400, {"errors": [{"message": "instance requires x"}]})
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, nota.id)
    assert exc_info.value.status_code == 502


def test_listar_no_mezcla_notas_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468", id_alegra="alegra-empresa-2")
    cliente_a = _crear_cliente(db_session, empresa_a.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    fake = _FakeAlegraClient()
    factura_a = _crear_factura_aceptada(db_session, fake, empresa_a, cliente_a, producto_a)
    service = NotaDebitoService(db_session, alegra_client=fake)
    service.crear_borrador(empresa_a.id, factura_a.id, _nota_payload(factura_a.lineas[0].id))

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_obtener_url_xml_pide_una_url_fresca_a_alegra(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.debit_note_response = {"debitNote": {"id": "dn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    fake.debit_note_response = {"files": {"xml": "https://s3.example.com/nota.xml"}}
    url = service.obtener_url_xml(empresa.id, nota.id)

    assert url == "https://s3.example.com/nota.xml"


_XML_CON_FIRMA = (
    b'<?xml version="1.0" encoding="UTF-8"?>'
    b'<DebitNote xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
    b'<ds:SignatureValue Id="xmldsig-1-sigvalue">firma-base64-de-prueba</ds:SignatureValue>'
    b"</DebitNote>"
)


def test_obtener_firma_digital_la_extrae_del_xml_y_la_cachea(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.debit_note_response = {"debitNote": {"id": "dn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    fake.debit_note_response = {"files": {"xml": "https://s3.example.com/nota.xml"}}
    fake.raw_response = _XML_CON_FIRMA
    firma = service.obtener_firma_digital(empresa.id, nota.id)

    assert firma == "firma-base64-de-prueba"
    assert service.obtener(empresa.id, nota.id).firma_digital == "firma-base64-de-prueba"


def test_generar_pdf_representacion_borrador_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))

    with pytest.raises(HTTPException) as exc_info:
        service.generar_pdf_representacion(empresa.id, nota.id)
    assert exc_info.value.status_code == 409


def test_generar_pdf_representacion_nota_aceptada_devuelve_bytes(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.debit_note_response = {
        "debitNote": {"id": "dn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"},
        "files": {"xml": "https://s3.example.com/nota.xml"},
    }
    fake.raw_response = _XML_CON_FIRMA
    service = NotaDebitoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    pdf_bytes = service.generar_pdf_representacion(empresa.id, nota.id)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
