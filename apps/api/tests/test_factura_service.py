from datetime import date

import pytest
from fastapi import HTTPException

from src.application.factura_service import FacturaService
from src.core.alegra_client import AlegraApiError
from src.domain.factura import ActualizarFacturaRequest, CrearFacturaRequest, LineaFacturaRequest
from src.infrastructure.db.models import Cliente, Empresa, Producto, ResolucionDian


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


def _crear_resolucion(db_session, empresa_id, **overrides) -> ResolucionDian:
    data = {
        "empresa_id": empresa_id,
        "numero_resolucion": "18760000001",
        "prefijo": "SETP",
        "rango_minimo": 1,
        "rango_maximo": 1000,
        "fecha_inicio": date(2026, 1, 1),
        "fecha_fin": date(2030, 1, 1),
        "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        "consecutivo_actual": 1,
    }
    data.update(overrides)
    resolucion = ResolucionDian(**data)
    db_session.add(resolucion)
    db_session.commit()
    db_session.refresh(resolucion)
    return resolucion


def _payload(cliente_id, producto_id, **overrides) -> CrearFacturaRequest:
    data = {
        "cliente_id": cliente_id,
        "fecha": date.today(),
        "lineas": [LineaFacturaRequest(producto_id=producto_id, cantidad=2)],
    }
    data.update(overrides)
    return CrearFacturaRequest(**data)


class _FakeAlegraClient:
    def __init__(self, response: dict | None = None, error: AlegraApiError | None = None, raw_response: bytes = b""):
        self._response = response
        self._error = error
        self._raw_response = raw_response
        self.last_payload = None

    def create_invoice(self, payload: dict) -> dict:
        self.last_payload = payload
        if self._error:
            raise self._error
        return self._response or {}

    def get_invoice(self, invoice_id: str) -> dict:
        if self._error:
            raise self._error
        return self._response or {}

    def fetch_raw(self, url: str) -> bytes:
        if self._error:
            raise self._error
        return self._raw_response


def test_crear_borrador_calcula_totales_en_servidor_y_no_asigna_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = FacturaService(db_session)

    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    assert factura.estado == "borrador"
    assert factura.consecutivo is None
    assert factura.numero_completo is None
    assert float(factura.subtotal) == 200000
    assert float(factura.total_impuestos) == 38000
    assert float(factura.total) == 238000
    assert len(factura.lineas) == 1
    assert factura.lineas[0].descripcion == producto.nombre
    assert factura.lineas[0].codigo == producto.codigo
    assert factura.lineas[0].unidad_medida == producto.unidad_medida


def test_crear_borrador_cliente_de_otro_tenant_falla_404(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468", id_alegra="alegra-empresa-2")
    cliente_b = _crear_cliente(db_session, empresa_b.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    service = FacturaService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.crear_borrador(empresa_a.id, _payload(cliente_b.id, producto_a.id))
    assert exc_info.value.status_code == 404


def test_crear_borrador_producto_de_otro_tenant_falla_404(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468", id_alegra="alegra-empresa-2")
    cliente_a = _crear_cliente(db_session, empresa_a.id)
    producto_b = _crear_producto(db_session, empresa_b.id)
    service = FacturaService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.crear_borrador(empresa_a.id, _payload(cliente_a.id, producto_b.id))
    assert exc_info.value.status_code == 404


def test_listar_no_mezcla_facturas_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468", id_alegra="alegra-empresa-2")
    cliente_a = _crear_cliente(db_session, empresa_a.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    service = FacturaService(db_session)
    service.crear_borrador(empresa_a.id, _payload(cliente_a.id, producto_a.id))

    assert len(service.listar(empresa_a.id)) == 1
    assert len(service.listar(empresa_b.id)) == 0


def test_obtener_de_otro_tenant_falla_404(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468", id_alegra="alegra-empresa-2")
    cliente_a = _crear_cliente(db_session, empresa_a.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    service = FacturaService(db_session)
    factura = service.crear_borrador(empresa_a.id, _payload(cliente_a.id, producto_a.id))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, factura.id)
    assert exc_info.value.status_code == 404


def test_actualizar_borrador_reemplaza_lineas_y_recalcula(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    otro_producto = _crear_producto(db_session, empresa.id, codigo="PROD-002", precio=50000, tarifa_impuesto=0)
    service = FacturaService(db_session)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    actualizada = service.actualizar_borrador(
        empresa.id,
        factura.id,
        ActualizarFacturaRequest(
            cliente_id=cliente.id,
            fecha=date.today(),
            lineas=[LineaFacturaRequest(producto_id=otro_producto.id, cantidad=3)],
        ),
    )

    assert len(actualizada.lineas) == 1
    assert actualizada.lineas[0].descripcion == otro_producto.nombre
    assert float(actualizada.subtotal) == 150000
    assert float(actualizada.total_impuestos) == 0
    assert float(actualizada.total) == 150000


def test_eliminar_borrador_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = FacturaService(db_session)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    service.eliminar_borrador(empresa.id, factura.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, factura.id)


def test_actualizar_o_eliminar_factura_no_borrador_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={"invoice": {"id": "inv-1", "cufe": "cufe-1", "fullNumber": "SETP1", "legalStatus": "ACCEPTED"}}
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    with pytest.raises(HTTPException) as exc_info:
        service.actualizar_borrador(empresa.id, factura.id, _payload(cliente.id, producto.id))
    assert exc_info.value.status_code == 409

    with pytest.raises(HTTPException) as exc_info:
        service.eliminar_borrador(empresa.id, factura.id)
    assert exc_info.value.status_code == 409


def test_enviar_sin_resolucion_falla_404(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = FacturaService(db_session, alegra_client=_FakeAlegraClient())
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 404


def test_enviar_resolucion_vencida_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id, fecha_inicio=date(2020, 1, 1), fecha_fin=date(2021, 1, 1))
    service = FacturaService(db_session, alegra_client=_FakeAlegraClient())
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 409


def test_enviar_incrementa_consecutivo_y_marca_aceptada(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "invoice": {
                "id": "inv-1",
                "cufe": "cufe-123",
                "fullNumber": "SETP1",
                "legalStatus": "ACCEPTED",
                "qrCodeContent": "NumFac: SETP1\nCUFE: cufe-123",
            }
        }
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    enviada = service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    assert enviada.estado == "aceptada"
    assert enviada.cufe == "cufe-123"
    assert enviada.qr_code_content == "NumFac: SETP1\nCUFE: cufe-123"
    # incrementar_consecutivo es pre-incremento: con rango_minimo=1, el primer
    # numero realmente asignado es 2 (comportamiento ya probado en Sprint 5).
    assert enviada.consecutivo == 2
    assert enviada.numero_completo == "SETP1"
    assert enviada.fecha_envio is not None
    assert enviada.fecha_respuesta is not None

    resolucion = db_session.query(ResolucionDian).filter(ResolucionDian.empresa_id == empresa.id).one()
    assert resolucion.consecutivo_actual == 2


def test_enviar_accepted_with_observations_marca_aceptada(db_session):
    """Hallazgo real contra el sandbox: la DIAN puede devolver
    ACCEPTED_WITH_OBSERVATIONS (aceptado con notificaciones no bloqueantes,
    ej. reglas FAZ09/FAJ43b) -- es una aceptacion real, no un estado
    intermedio. No confundir con REJECTED ni dejarlo en 'enviada'."""
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "invoice": {
                "id": "inv-1",
                "cufe": "cufe-123",
                "fullNumber": "SETP1",
                "legalStatus": "ACCEPTED_WITH_OBSERVATIONS",
            }
        }
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    enviada = service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    assert enviada.estado == "aceptada"
    assert enviada.cufe == "cufe-123"
    assert enviada.fecha_respuesta is not None


def test_enviar_rechazada_guarda_razon_mapeada(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "invoice": {
                "id": "inv-1",
                "cufe": "cufe-123",
                "fullNumber": "SETP1",
                "legalStatus": "REJECTED",
                "governmentResponse": {"code": "89", "message": "NIT no autorizado"},
            }
        }
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    enviada = service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    assert enviada.estado == "rechazada"
    assert "Resolucion DIAN" in enviada.razon_rechazo


def test_enviar_accepted_with_observations_guarda_notificaciones_dian(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "invoice": {
                "id": "inv-1",
                "cufe": "cufe-123",
                "fullNumber": "SETP1",
                "legalStatus": "ACCEPTED_WITH_OBSERVATIONS",
                "governmentResponse": {
                    "code": "00",
                    "message": "Procesado Correctamente.",
                    "errorMessages": ["FAZ09: observacion no bloqueante", "FAJ43b: otra observacion"],
                },
            }
        }
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    enviada = service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    assert enviada.estado == "aceptada"
    assert enviada.notificaciones_dian == ["FAZ09: observacion no bloqueante", "FAJ43b: otra observacion"]


def test_editar_factura_rechazada_la_vuelve_a_borrador_y_permite_reenviar(db_session):
    """Una factura rechazada no es un callejon sin salida: el usuario corrige
    los datos (PUT), la factura vuelve a 'borrador' con los datos del intento
    fallido limpios, y un reenvio pide un consecutivo nuevo (no se puede
    reusar el numero rechazado ante la DIAN)."""
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    otro_producto = _crear_producto(db_session, empresa.id, codigo="PROD-002", precio=50000, tarifa_impuesto=0)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "invoice": {
                "id": "inv-1",
                "cufe": "cufe-rechazada",
                "fullNumber": "SETP1",
                "legalStatus": "REJECTED",
                "governmentResponse": {
                    "code": "89",
                    "message": "NIT no autorizado",
                    "errorMessages": ["Regla FAB10b violada"],
                },
            }
        }
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    rechazada = service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")
    assert rechazada.estado == "rechazada"
    assert rechazada.consecutivo == 2

    corregida = service.actualizar_borrador(
        empresa.id,
        factura.id,
        ActualizarFacturaRequest(
            cliente_id=cliente.id,
            fecha=date.today(),
            lineas=[LineaFacturaRequest(producto_id=otro_producto.id, cantidad=1)],
        ),
    )
    assert corregida.estado == "borrador"
    assert corregida.consecutivo is None
    assert corregida.numero_completo is None
    assert corregida.cufe is None
    assert corregida.razon_rechazo is None
    assert corregida.notificaciones_dian is None

    fake._response = {
        "invoice": {
            "id": "inv-2",
            "cufe": "cufe-aceptada",
            "fullNumber": "SETP2",
            "legalStatus": "ACCEPTED",
        }
    }
    reenviada = service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    assert reenviada.estado == "aceptada"
    assert reenviada.cufe == "cufe-aceptada"
    assert reenviada.razon_rechazo is None
    # consecutivo nuevo, no se reutiliza el 2 ya rechazado ante la DIAN.
    assert reenviada.consecutivo == 3


def test_eliminar_factura_rechazada_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={
            "invoice": {
                "id": "inv-1",
                "legalStatus": "REJECTED",
                "governmentResponse": {"code": "89", "message": "NIT no autorizado"},
            }
        }
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    service.eliminar_borrador(empresa.id, factura.id)

    assert service.listar(empresa.id) == []


def test_enviar_con_lineas_mixtas_taxable_total_solo_suma_lineas_con_impuesto(db_session):
    """Bug real reproducido contra el sandbox: si la factura mezcla lineas
    con y sin impuesto, totalAmounts.taxableTotal (Base Imponible) debe ser
    solo la suma de las lineas CON impuesto -- incluir las lineas sin
    impuesto ahi produce el rechazo 'Regla FAU04: Base Imponible es
    distinto a la suma de los valores de las bases imponibles de todas
    lineas de detalle'."""
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto_sin_iva = _crear_producto(
        db_session, empresa.id, codigo="SIN-IVA", precio=25000, tributo=None, tarifa_impuesto=0
    )
    producto_con_iva = _crear_producto(
        db_session, empresa.id, codigo="CON-IVA", precio=100000, tributo="01", tarifa_impuesto=19
    )
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={"invoice": {"id": "inv-1", "cufe": "cufe-1", "fullNumber": "SETP1", "legalStatus": "ACCEPTED"}}
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(
        empresa.id,
        CrearFacturaRequest(
            cliente_id=cliente.id,
            fecha=date.today(),
            lineas=[
                LineaFacturaRequest(producto_id=producto_sin_iva.id, cantidad=1),
                LineaFacturaRequest(producto_id=producto_con_iva.id, cantidad=1),
            ],
        ),
    )

    service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    totales = fake.last_payload["totalAmounts"]
    assert totales["grossTotal"] == 125000  # 25000 + 100000, todas las lineas
    assert totales["taxableTotal"] == 100000  # solo la linea con IVA


def test_enviar_error_alegra_se_mapea_y_no_queda_en_estado_intermedio(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(error=AlegraApiError(400, {"errors": [{"message": "instance requires x"}]}))
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")
    assert exc_info.value.status_code == 502

    sin_cambios = service.obtener(empresa.id, factura.id)
    assert sin_cambios.estado == "borrador"
    resolucion = db_session.query(ResolucionDian).filter(ResolucionDian.empresa_id == empresa.id).one()
    assert resolucion.consecutivo_actual == 2  # el consecutivo si avanzo, comportamiento aceptado (ver plan)


def test_obtener_url_xml_pide_una_url_fresca_a_alegra(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={"invoice": {"id": "inv-1", "fullNumber": "SETP1", "legalStatus": "ACCEPTED"}}
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")

    fake._response = {"files": {"xml": "https://s3.example.com/factura.xml"}}
    url = service.obtener_url_xml(empresa.id, factura.id)

    assert url == "https://s3.example.com/factura.xml"


def test_obtener_url_xml_factura_sin_enviar_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = FacturaService(db_session, alegra_client=_FakeAlegraClient())
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener_url_xml(empresa.id, factura.id)
    assert exc_info.value.status_code == 409


_XML_CON_FIRMA = (
    b'<?xml version="1.0" encoding="UTF-8"?>'
    b'<Invoice xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
    b'<ds:SignatureValue Id="xmldsig-1-sigvalue">firma-base64-de-prueba</ds:SignatureValue>'
    b"</Invoice>"
)
_XML_SIN_FIRMA = b'<?xml version="1.0" encoding="UTF-8"?><Invoice></Invoice>'


def test_obtener_firma_digital_la_extrae_del_xml_y_la_cachea(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={"invoice": {"id": "inv-1", "fullNumber": "SETP1", "legalStatus": "ACCEPTED"}},
        raw_response=_XML_CON_FIRMA,
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")
    fake._response = {"files": {"xml": "https://s3.example.com/factura.xml"}}

    firma = service.obtener_firma_digital(empresa.id, factura.id)
    assert firma == "firma-base64-de-prueba"

    actualizada = service.obtener(empresa.id, factura.id)
    assert actualizada.firma_digital == "firma-base64-de-prueba"

    # Segunda llamada no vuelve a pedirle nada a Alegra -- usa el cache.
    fake._error = AlegraApiError(500, {})
    assert service.obtener_firma_digital(empresa.id, factura.id) == "firma-base64-de-prueba"


def test_obtener_firma_digital_sin_firma_en_el_xml_falla_404(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    _crear_resolucion(db_session, empresa.id)
    fake = _FakeAlegraClient(
        response={"invoice": {"id": "inv-1", "fullNumber": "SETP1", "legalStatus": "ACCEPTED"}},
        raw_response=_XML_SIN_FIRMA,
    )
    service = FacturaService(db_session, alegra_client=fake)
    factura = service.crear_borrador(empresa.id, _payload(cliente.id, producto.id))
    service.enviar(empresa.id, factura.id, forma_pago="1", metodo_pago="10")
    fake._response = {"files": {"xml": "https://s3.example.com/factura.xml"}}

    with pytest.raises(HTTPException) as exc_info:
        service.obtener_firma_digital(empresa.id, factura.id)
    assert exc_info.value.status_code == 404
