from datetime import date

import pytest
from fastapi import HTTPException

from src.application.factura_service import FacturaService
from src.application.nota_credito_service import NotaCreditoService
from src.core.alegra_client import AlegraApiError
from src.domain.factura import CrearFacturaRequest, LineaFacturaRequest
from src.domain.nota_credito import ActualizarNotaCreditoRequest, CrearNotaCreditoRequest, LineaNotaCreditoRequest
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
    """Fake combinado -- crea facturas (para dejar el escenario en estado
    'aceptada') y notas credito, cada una con su propia respuesta/error
    configurable por separado."""

    def __init__(self):
        self.invoice_response: dict = {
            "invoice": {"id": "inv-1", "cufe": "cufe-factura-1", "fullNumber": "SETP1", "legalStatus": "ACCEPTED"}
        }
        self.credit_note_response: dict | None = None
        self.credit_note_error: AlegraApiError | None = None
        self.last_credit_note_payload: dict | None = None
        self.raw_response: bytes = b""

    def create_invoice(self, payload: dict) -> dict:
        return self.invoice_response

    def create_credit_note(self, payload: dict) -> dict:
        self.last_credit_note_payload = payload
        if self.credit_note_error:
            raise self.credit_note_error
        return self.credit_note_response or {}

    def get_credit_note(self, credit_note_id: str) -> dict:
        if self.credit_note_error:
            raise self.credit_note_error
        return self.credit_note_response or {}

    def fetch_raw(self, url: str) -> bytes:
        if self.credit_note_error:
            raise self.credit_note_error
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


def _nota_payload(factura_linea_id, cantidad=1, motivo_codigo="1") -> CrearNotaCreditoRequest:
    return CrearNotaCreditoRequest(
        motivo_codigo=motivo_codigo, lineas=[LineaNotaCreditoRequest(factura_linea_id=factura_linea_id, cantidad=cantidad)]
    )


def test_crear_borrador_calcula_totales_y_no_asigna_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    service = NotaCreditoService(db_session, alegra_client=fake)

    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))

    assert nota.estado == "borrador"
    assert nota.consecutivo is None
    assert nota.numero_completo is None
    assert float(nota.subtotal) == 100000
    assert float(nota.total_impuestos) == 19000
    assert float(nota.total) == 119000
    assert nota.lineas[0].descripcion == producto.nombre


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
    service = NotaCreditoService(db_session, alegra_client=fake)

    with pytest.raises(HTTPException) as exc_info:
        service.crear_borrador(empresa.id, borrador.id, _nota_payload(borrador.lineas[0].id))
    assert exc_info.value.status_code == 409


def test_crear_borrador_cantidad_mayor_a_disponible_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    service = NotaCreditoService(db_session, alegra_client=fake)

    with pytest.raises(HTTPException) as exc_info:
        service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=3))
    assert exc_info.value.status_code == 409


def test_crear_borrador_linea_de_otra_factura_falla_404(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura_1 = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.invoice_response = {
        "invoice": {"id": "inv-2", "cufe": "cufe-factura-2", "fullNumber": "SETP2", "legalStatus": "ACCEPTED"}
    }
    factura_2 = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    service = NotaCreditoService(db_session, alegra_client=fake)

    with pytest.raises(HTTPException) as exc_info:
        service.crear_borrador(empresa.id, factura_2.id, _nota_payload(factura_1.lineas[0].id))
    assert exc_info.value.status_code == 404


def test_actualizar_borrador_reemplaza_lineas_y_recalcula(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))

    actualizada = service.actualizar_borrador(
        empresa.id,
        nota.id,
        ActualizarNotaCreditoRequest(
            motivo_codigo="3", lineas=[LineaNotaCreditoRequest(factura_linea_id=factura.lineas[0].id, cantidad=2)]
        ),
    )

    assert actualizada.motivo_codigo == "3"
    assert float(actualizada.total) == 238000


def test_eliminar_borrador_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    service = NotaCreditoService(db_session, alegra_client=fake)
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
    fake.credit_note_response = {
        "creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED", "qrCodeContent": "NumFac: 1"}
    }
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))

    enviada = service.enviar(empresa.id, nota.id)

    assert enviada.estado == "aceptada"
    assert enviada.cude == "cude-1"
    assert enviada.consecutivo == 1
    assert enviada.numero_completo == "NC-000001"


def test_enviar_no_afecta_estado_de_la_factura_si_es_parcial(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))

    service.enviar(empresa.id, nota.id)

    factura_actualizada = FacturaService(db_session).obtener(empresa.id, factura.id)
    assert factura_actualizada.estado == "aceptada"


def test_enviar_credito_total_marca_factura_como_anulada(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=2))

    service.enviar(empresa.id, nota.id)

    factura_actualizada = FacturaService(db_session).obtener(empresa.id, factura.id)
    assert factura_actualizada.estado == "anulada"


def test_dos_notas_parciales_suman_y_anulan_al_completar(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    service = NotaCreditoService(db_session, alegra_client=fake)

    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    nota_1 = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))
    service.enviar(empresa.id, nota_1.id)

    factura_actualizada = FacturaService(db_session).obtener(empresa.id, factura.id)
    assert factura_actualizada.estado == "aceptada"

    fake.credit_note_response = {"creditNote": {"id": "cn-2", "cude": "cude-2", "legalStatus": "ACCEPTED"}}
    nota_2 = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))
    service.enviar(empresa.id, nota_2.id)

    factura_final = FacturaService(db_session).obtener(empresa.id, factura.id)
    assert factura_final.estado == "anulada"
    assert nota_2.consecutivo == 2
    assert nota_2.numero_completo == "NC-000002"


def test_enviar_rechazada_no_cambia_la_factura(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.credit_note_response = {
        "creditNote": {
            "id": "cn-1",
            "legalStatus": "REJECTED",
            "governmentResponse": {"code": "89", "message": "NIT no autorizado"},
        }
    }
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=2))

    enviada = service.enviar(empresa.id, nota.id)

    assert enviada.estado == "rechazada"
    factura_actualizada = FacturaService(db_session).obtener(empresa.id, factura.id)
    assert factura_actualizada.estado == "aceptada"


def test_enviar_error_alegra_se_mapea_502(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.credit_note_error = AlegraApiError(400, {"errors": [{"message": "instance requires x"}]})
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, nota.id)
    assert exc_info.value.status_code == 502


def test_anular_factura_acredita_el_100_por_ciento_con_motivo_fijo(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)

    nota = service.anular_factura(empresa.id, factura.id)

    assert nota.motivo_codigo == "2"
    assert nota.estado == "aceptada"
    assert float(nota.lineas[0].cantidad) == 2
    factura_actualizada = FacturaService(db_session).obtener(empresa.id, factura.id)
    assert factura_actualizada.estado == "anulada"


def test_anular_factura_ya_acreditada_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    service.anular_factura(empresa.id, factura.id)

    with pytest.raises(HTTPException) as exc_info:
        service.anular_factura(empresa.id, factura.id)
    assert exc_info.value.status_code == 409


def test_listar_no_mezcla_notas_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468", id_alegra="alegra-empresa-2")
    cliente_a = _crear_cliente(db_session, empresa_a.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    fake = _FakeAlegraClient()
    factura_a = _crear_factura_aceptada(db_session, fake, empresa_a, cliente_a, producto_a)
    service = NotaCreditoService(db_session, alegra_client=fake)
    service.crear_borrador(empresa_a.id, factura_a.id, _nota_payload(factura_a.lineas[0].id))

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_listar_filtra_por_factura_id(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura_1 = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.invoice_response = {
        "invoice": {"id": "inv-2", "cufe": "cufe-factura-2", "fullNumber": "SETP2", "legalStatus": "ACCEPTED"}
    }
    factura_2 = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    service = NotaCreditoService(db_session, alegra_client=fake)
    service.crear_borrador(empresa.id, factura_1.id, _nota_payload(factura_1.lineas[0].id))
    service.crear_borrador(empresa.id, factura_2.id, _nota_payload(factura_2.lineas[0].id))

    assert len(service.listar(empresa.id, factura_id=factura_1.id)) == 1
    assert len(service.listar(empresa.id)) == 2


def test_obtener_url_xml_pide_una_url_fresca_a_alegra(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    fake.credit_note_response = {"files": {"xml": "https://s3.example.com/nota.xml"}}
    url = service.obtener_url_xml(empresa.id, nota.id)

    assert url == "https://s3.example.com/nota.xml"


def test_obtener_url_xml_nota_sin_enviar_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener_url_xml(empresa.id, nota.id)
    assert exc_info.value.status_code == 409


def test_disponibilidad_lineas_por_factura_refleja_lo_acreditado(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))
    service.enviar(empresa.id, nota.id)

    disponibilidad = service.disponibilidad_lineas_por_factura(empresa.id, factura.id)

    assert disponibilidad[factura.lineas[0].id] == 1


def test_editar_nota_rechazada_la_vuelve_a_borrador_y_permite_reenviar(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto, cantidad=2)
    fake.credit_note_response = {
        "creditNote": {
            "id": "cn-1",
            "legalStatus": "REJECTED",
            "governmentResponse": {"code": "89", "message": "NIT no autorizado", "errorMessages": ["Regla FAU04"]},
        }
    }
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id, cantidad=1))
    rechazada = service.enviar(empresa.id, nota.id)
    assert rechazada.estado == "rechazada"
    assert rechazada.consecutivo == 1

    corregida = service.actualizar_borrador(
        empresa.id,
        nota.id,
        ActualizarNotaCreditoRequest(
            motivo_codigo="3",
            lineas=[LineaNotaCreditoRequest(factura_linea_id=factura.lineas[0].id, cantidad=2)],
        ),
    )
    assert corregida.estado == "borrador"
    assert corregida.consecutivo is None
    assert corregida.numero_completo is None
    assert corregida.cude is None
    assert corregida.razon_rechazo is None
    assert corregida.notificaciones_dian is None

    fake.credit_note_response = {"creditNote": {"id": "cn-2", "cude": "cude-aceptada", "legalStatus": "ACCEPTED"}}
    reenviada = service.enviar(empresa.id, nota.id)

    assert reenviada.estado == "aceptada"
    assert reenviada.cude == "cude-aceptada"
    assert reenviada.razon_rechazo is None
    # consecutivo nuevo, no se reutiliza el 1 ya rechazado ante la DIAN.
    assert reenviada.consecutivo == 2
    assert reenviada.numero_completo == "NC-000002"


def test_eliminar_nota_rechazada_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "legalStatus": "REJECTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    service.eliminar_borrador(empresa.id, nota.id)

    assert service.listar(empresa.id) == []


_XML_CON_FIRMA = (
    b'<?xml version="1.0" encoding="UTF-8"?>'
    b'<CreditNote xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
    b'<ds:SignatureValue Id="xmldsig-1-sigvalue">firma-base64-de-prueba</ds:SignatureValue>'
    b"</CreditNote>"
)
_XML_SIN_FIRMA = b'<?xml version="1.0" encoding="UTF-8"?><CreditNote></CreditNote>'


def test_obtener_firma_digital_la_extrae_del_xml_y_la_cachea(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    fake.credit_note_response = {"files": {"xml": "https://s3.example.com/nota.xml"}}
    fake.raw_response = _XML_CON_FIRMA
    firma = service.obtener_firma_digital(empresa.id, nota.id)
    assert firma == "firma-base64-de-prueba"

    actualizada = service.obtener(empresa.id, nota.id)
    assert actualizada.firma_digital == "firma-base64-de-prueba"

    # Segunda llamada no vuelve a pedirle nada a Alegra -- usa el cache.
    fake.credit_note_error = AlegraApiError(500, {})
    assert service.obtener_firma_digital(empresa.id, nota.id) == "firma-base64-de-prueba"


def test_obtener_firma_digital_sin_firma_en_el_xml_falla_404(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    fake.credit_note_response = {"creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"}}
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    fake.credit_note_response = {"files": {"xml": "https://s3.example.com/nota.xml"}}
    fake.raw_response = _XML_SIN_FIRMA

    with pytest.raises(HTTPException) as exc_info:
        service.obtener_firma_digital(empresa.id, nota.id)
    assert exc_info.value.status_code == 404


def test_generar_pdf_representacion_borrador_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    fake = _FakeAlegraClient()
    factura = _crear_factura_aceptada(db_session, fake, empresa, cliente, producto)
    service = NotaCreditoService(db_session, alegra_client=fake)
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
    fake.credit_note_response = {
        "creditNote": {"id": "cn-1", "cude": "cude-1", "legalStatus": "ACCEPTED"},
        "files": {"xml": "https://s3.example.com/nota.xml"},
    }
    fake.raw_response = _XML_CON_FIRMA
    service = NotaCreditoService(db_session, alegra_client=fake)
    nota = service.crear_borrador(empresa.id, factura.id, _nota_payload(factura.lineas[0].id))
    service.enviar(empresa.id, nota.id)

    pdf_bytes = service.generar_pdf_representacion(empresa.id, nota.id)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
