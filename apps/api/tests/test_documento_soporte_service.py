from datetime import date

import pytest
from fastapi import HTTPException

from src.application.documento_soporte_service import DocumentoSoporteService
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.domain.documento_soporte import CrearDocumentoSoporteRequest, LineaDocumentoSoporteRequest
from src.infrastructure.db.models import Empresa, Producto, Proveedor, ResolucionDocumentoSoporte


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
        "id_alegra": "alegra-empresa-1",
        "regimen_fiscal": "48",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_proveedor(db_session, empresa_id, **overrides) -> Proveedor:
    """Por defecto ya cumple los requisitos de Documento Soporte (NIT,
    tipo_organizacion, direccion) -- los tests de validacion sobreescriben
    lo que quieran dejar incompleto."""
    data = {
        "empresa_id": empresa_id,
        "tipo_identificacion": "31",
        "numero_identificacion": "1000000000",
        "digito_verificacion": "4",
        "nombre": "Proveedor de prueba",
        "correo_electronico": "proveedor@example.com",
        "tipo_organizacion": "2",
        "regimen": "R-99-PN",
        "direccion": "Cra 1 # 2-3",
        "departamento": "11",
        "municipio": "11001",
    }
    data.update(overrides)
    proveedor = Proveedor(**data)
    db_session.add(proveedor)
    db_session.commit()
    db_session.refresh(proveedor)
    return proveedor


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


def _crear_resolucion(db_session, empresa_id, **overrides) -> ResolucionDocumentoSoporte:
    data = {
        "empresa_id": empresa_id,
        "numero_resolucion": "18760000002",
        "prefijo": "SEDS",
        "rango_minimo": 1,
        "rango_maximo": 1000,
        "fecha_inicio": date(2026, 1, 1),
        "fecha_fin": date(2030, 1, 1),
        "consecutivo_actual": 1,
    }
    data.update(overrides)
    resolucion = ResolucionDocumentoSoporte(**data)
    db_session.add(resolucion)
    db_session.commit()
    db_session.refresh(resolucion)
    return resolucion


def _payload(proveedor_id, producto_id, **overrides) -> CrearDocumentoSoporteRequest:
    data = {
        "proveedor_id": proveedor_id,
        "fecha": date.today(),
        "lineas": [LineaDocumentoSoporteRequest(producto_id=producto_id, cantidad=2)],
    }
    data.update(overrides)
    return CrearDocumentoSoporteRequest(**data)


class _FakeAlegraClient:
    def __init__(
        self,
        response: dict | None = None,
        error: AlegraApiError | None = None,
        raw_response: bytes = b"",
    ):
        self._response = response
        self._error = error
        self.raw_response = raw_response
        self.last_payload = None

    def get_support_document(self, support_document_id: str) -> dict:
        return {"supportDocument": {"id": support_document_id}, "files": {"xml": "https://s3.example.com/ds.xml"}}

    def fetch_raw(self, url: str) -> bytes:
        return self.raw_response

    def create_support_document(self, payload: dict) -> dict:
        self.last_payload = payload
        if self._error:
            raise self._error
        return self._response or {}


def test_crear_borrador_calcula_totales_sin_impuestos_y_no_asigna_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = DocumentoSoporteService(db_session)

    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    assert documento.estado == "borrador"
    assert documento.consecutivo is None
    assert float(documento.subtotal) == 200000
    assert float(documento.total_impuestos) == 0
    assert float(documento.total) == 200000
    assert len(documento.lineas) == 1
    assert documento.lineas[0].descripcion == producto.nombre


def test_crear_borrador_ignora_el_iva_del_producto(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id, tributo="01", tarifa_impuesto=19)
    service = DocumentoSoporteService(db_session)

    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    linea = documento.lineas[0]
    assert linea.tributo is None
    assert float(linea.tarifa_impuesto) == 0
    assert float(linea.impuesto_linea) == 0
    assert float(linea.total_linea) == float(linea.subtotal_linea) == 200000


def test_crear_borrador_proveedor_de_otro_tenant_falla_404(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468", id_alegra="alegra-empresa-2")
    proveedor_b = _crear_proveedor(db_session, empresa_b.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    service = DocumentoSoporteService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.crear_borrador(empresa_a.id, _payload(proveedor_b.id, producto_a.id))
    assert exc_info.value.status_code == 404


def test_actualizar_borrador_reemplaza_lineas_y_recalcula(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    otro_producto = _crear_producto(db_session, empresa.id, codigo="PROD-002", precio=50000, tarifa_impuesto=0)
    service = DocumentoSoporteService(db_session)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    actualizado = service.actualizar_borrador(
        empresa.id,
        documento.id,
        _payload(proveedor.id, otro_producto.id, lineas=[LineaDocumentoSoporteRequest(producto_id=otro_producto.id, cantidad=3)]),
    )

    assert len(actualizado.lineas) == 1
    assert float(actualizado.subtotal) == 150000
    assert float(actualizado.total_impuestos) == 0


def test_eliminar_borrador_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = DocumentoSoporteService(db_session)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    service.eliminar_borrador(empresa.id, documento.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, documento.id)


def test_enviar_sin_resolucion_falla_404(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = DocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient())
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 404


def test_enviar_proveedor_con_cedula_falla_409(db_session):
    """Confirmado contra el schema real de Alegra (Fase 3): el enum de
    supplier.identificationType excluye cedula (13) de forma permanente."""
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id, tipo_identificacion="13", digito_verificacion=None)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    service = DocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient())
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 409
    assert "NIT" in exc_info.value.detail


def test_enviar_proveedor_sin_tipo_organizacion_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id, tipo_organizacion=None)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    service = DocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient())
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 409
    assert "organizacion" in exc_info.value.detail.lower()


def test_enviar_proveedor_sin_direccion_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id, direccion=None)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    service = DocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient())
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 409
    assert "direccion" in exc_info.value.detail.lower()


def test_enviar_incrementa_consecutivo_y_marca_aceptado(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "supportDocument": {
                "id": "ds-1",
                "cuds": "cuds-1",
                "fullNumber": "SEDS1",
                "legalStatus": "ACCEPTED",
                "governmentResponse": {"code": "00", "message": "Procesado Correctamente."},
            }
        }
    )
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    enviado = service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")

    assert enviado.estado == "aceptado"
    assert enviado.consecutivo == 2  # pre-incremento: consecutivo_actual arranca en rango_minimo=1
    assert enviado.numero_completo == "SEDS1"
    assert enviado.cuds == "cuds-1"

    assert fake.last_payload["supplier"]["identificationType"] == "31"
    assert fake.last_payload["supplier"]["organizationType"] == 2
    assert fake.last_payload["company"]["taxCode"] == {"id": "01"}
    assert fake.last_payload["items"][0]["standardCode"]["id"] == "999"
    # El IVA 19% del producto no debe viajar: el Documento Soporte no lleva impuestos.
    assert "taxes" not in fake.last_payload["items"][0]
    assert fake.last_payload["items"][0]["taxAmount"] == 0
    assert fake.last_payload["totalAmounts"]["taxTotal"] == 0
    assert fake.last_payload["totalAmounts"]["payableTotal"] == 200000


def test_enviar_accepted_with_observations_marca_aceptado(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "supportDocument": {
                "id": "ds-1",
                "cuds": "cuds-1",
                "fullNumber": "SEDS1",
                "legalStatus": "ACCEPTED_WITH_OBSERVATIONS",
                "governmentResponse": {"code": "00", "errorMessages": ["aviso no bloqueante"]},
            }
        }
    )
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    enviado = service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")

    assert enviado.estado == "aceptado"
    assert enviado.notificaciones_dian == ["aviso no bloqueante"]


def test_enviar_rechazado_guarda_razon_mapeada(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "supportDocument": {
                "id": "ds-1",
                "fullNumber": "SEDS1",
                "legalStatus": "REJECTED",
                "governmentResponse": {"code": "99", "message": "Validacion contiene errores."},
            }
        }
    )
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    enviado = service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")

    assert enviado.estado == "rechazado"
    assert enviado.razon_rechazo == "Validacion contiene errores."


def test_enviar_error_alegra_no_deja_estado_intermedio(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(error=AlegraApiError(400, {"errors": [{"message": "dato invalido"}]}))
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 400

    db_session.refresh(documento)
    assert documento.estado == "borrador"


def test_rechazado_se_puede_corregir_y_reenviar(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={"supportDocument": {"id": "ds-1", "fullNumber": "SEDS1", "legalStatus": "REJECTED", "governmentResponse": {}}}
    )
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))
    documento = service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert documento.estado == "rechazado"

    corregido = service.actualizar_borrador(empresa.id, documento.id, _payload(proveedor.id, producto.id))
    assert corregido.estado == "borrador"
    assert corregido.consecutivo is None


_XML_CON_FIRMA = (
    b'<?xml version="1.0" encoding="UTF-8"?>'
    b'<SupportDocument xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
    b'<ds:SignatureValue Id="xmldsig-1-sigvalue">firma-base64-de-prueba</ds:SignatureValue>'
    b"</SupportDocument>"
)

_RESPUESTA_ACEPTADA = {
    "supportDocument": {
        "id": "ds-1",
        "cuds": "cuds-1",
        "fullNumber": "SEDS1",
        "legalStatus": "ACCEPTED",
        "governmentResponse": {"code": "00", "message": "Procesado Correctamente."},
    }
}


def _crear_documento_aceptado(db_session, **proveedor_overrides):
    """Devuelve (empresa, proveedor, documento, service) con un documento ya
    aceptado -- el envio automatico de correo corre con el EmailClient falso
    del conftest, asi que no toca la red."""
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id, **proveedor_overrides)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(response=_RESPUESTA_ACEPTADA, raw_response=_XML_CON_FIRMA)
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))
    documento = service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    return empresa, proveedor, documento, service


def test_obtener_url_xml_pide_una_url_fresca_a_alegra(db_session):
    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session)

    assert service.obtener_url_xml(empresa.id, documento.id) == "https://s3.example.com/ds.xml"


def test_obtener_url_xml_borrador_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = DocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient())
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener_url_xml(empresa.id, documento.id)
    assert exc_info.value.status_code == 409


def test_obtener_firma_digital_la_extrae_del_xml_y_la_cachea(db_session):
    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session)

    firma = service.obtener_firma_digital(empresa.id, documento.id)

    assert firma == "firma-base64-de-prueba"
    assert service.obtener(empresa.id, documento.id).firma_digital == "firma-base64-de-prueba"


def test_generar_pdf_representacion_borrador_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = DocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient())
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.generar_pdf_representacion(empresa.id, documento.id)
    assert exc_info.value.status_code == 409


def test_generar_pdf_representacion_documento_aceptado_devuelve_bytes(db_session):
    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session)

    pdf_bytes = service.generar_pdf_representacion(empresa.id, documento.id)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0


def test_enviar_por_correo_documento_no_aceptado_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = DocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient())
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar_por_correo(empresa.id, documento.id)
    assert exc_info.value.status_code == 409


def test_enviar_por_correo_proveedor_sin_correo_falla_400(db_session):
    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session, correo_electronico="")

    with pytest.raises(HTTPException) as exc_info:
        service.enviar_por_correo(empresa.id, documento.id)
    assert exc_info.value.status_code == 400


def test_enviar_por_correo_manda_qr_pdf_y_xml_al_proveedor(db_session, monkeypatch):
    enviados = []

    class _RecordingEmailClient:
        def send(self, to, subject, html, attachments=None):
            enviados.append({"to": to, "subject": subject, "html": html, "attachments": attachments})

    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session)
    enviados.clear()  # ignora el envio automatico al aceptarse
    monkeypatch.setattr("src.application.documento_soporte_service.EmailClient", _RecordingEmailClient)

    service.enviar_por_correo(empresa.id, documento.id)

    assert len(enviados) == 1
    correo = enviados[0]
    assert correo["to"] == "proveedor@example.com"
    assert "SEDS1" in correo["subject"]
    assert "cuds-1" in correo["html"]
    assert [a["filename"] for a in correo["attachments"]] == ["SEDS1.png", "SEDS1.pdf", "SEDS1.xml"]


def test_enviar_por_correo_reporta_502_si_falla_el_envio(db_session, monkeypatch):
    """El reenvio manual (a diferencia del automatico, best-effort) debe
    reportar un fallo real de Resend en vez de fallar en silencio."""
    from src.core.email_client import EmailSendError

    class _FailingEmailClient:
        def send(self, **kwargs):
            raise EmailSendError("fallo simulado de Resend")

    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session)
    monkeypatch.setattr("src.application.documento_soporte_service.EmailClient", _FailingEmailClient)

    with pytest.raises(HTTPException) as exc_info:
        service.enviar_por_correo(empresa.id, documento.id)
    assert exc_info.value.status_code == 502


def test_enviar_notifica_al_proveedor_cuando_queda_aceptado(db_session, monkeypatch):
    enviados = []

    class _RecordingEmailClient:
        def send(self, to, subject, html, attachments=None):
            enviados.append(to)

    monkeypatch.setattr("src.application.documento_soporte_service.EmailClient", _RecordingEmailClient)

    _crear_documento_aceptado(db_session)

    assert enviados == ["proveedor@example.com"]


def test_enviar_no_se_rompe_si_falla_la_notificacion_por_correo(db_session, monkeypatch):
    class _FailingEmailClient:
        def send(self, **kwargs):
            raise RuntimeError("Resend caido")

    monkeypatch.setattr("src.application.documento_soporte_service.EmailClient", _FailingEmailClient)

    _empresa, _proveedor, documento, _service = _crear_documento_aceptado(db_session)

    assert documento.estado == "aceptado"


def test_enviar_rechazado_no_notifica_por_correo(db_session, monkeypatch):
    enviados = []

    class _RecordingEmailClient:
        def send(self, to, subject, html, attachments=None):
            enviados.append(to)

    monkeypatch.setattr("src.application.documento_soporte_service.EmailClient", _RecordingEmailClient)
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "supportDocument": {
                "id": "ds-1",
                "fullNumber": "SEDS1",
                "legalStatus": "REJECTED",
                "governmentResponse": {"code": "99", "message": "Rechazado"},
            }
        }
    )
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    rechazado = service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")

    assert rechazado.estado == "rechazado"
    assert enviados == []


def test_enviar_por_correo_manda_al_correo_pedido_y_no_al_del_proveedor(db_session, monkeypatch):
    enviados = []

    class _RecordingEmailClient:
        def send(self, to, subject, html, attachments=None):
            enviados.append(to)

    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session)
    enviados.clear()  # ignora el envio automatico al aceptarse
    monkeypatch.setattr("src.application.documento_soporte_service.EmailClient", _RecordingEmailClient)

    service.enviar_por_correo(empresa.id, documento.id, "otro@example.com")

    assert enviados == ["otro@example.com"]


def test_enviar_por_correo_proveedor_sin_correo_pero_con_correo_pedido_envia(db_session, monkeypatch):
    enviados = []

    class _RecordingEmailClient:
        def send(self, to, subject, html, attachments=None):
            enviados.append(to)

    empresa, _proveedor, documento, service = _crear_documento_aceptado(db_session, correo_electronico="")
    monkeypatch.setattr("src.application.documento_soporte_service.EmailClient", _RecordingEmailClient)

    service.enviar_por_correo(empresa.id, documento.id, "otro@example.com")

    assert enviados == ["otro@example.com"]



def test_enviar_tras_un_rechazo_4xx_de_alegra_reutiliza_el_mismo_numero(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    resolucion = _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(error=AlegraApiError(400, {"errors": [{"message": "dato invalido"}]}))
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException):
        service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")

    db_session.refresh(resolucion)
    assert resolucion.consecutivo_actual == 1  # el numero no se quemo

    fake._error = None
    fake._response = {"supportDocument": {"id": "ds-1", "fullNumber": "SEDS2", "legalStatus": "ACCEPTED"}}
    enviado = service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert enviado.consecutivo == 2


def test_enviar_error_transitorio_de_alegra_no_revierte_el_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    resolucion = _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(error=AlegraTransientError("timeout"))
    service = DocumentoSoporteService(db_session, alegra_client=fake)
    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, documento.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 502

    db_session.refresh(resolucion)
    assert resolucion.consecutivo_actual == 2
