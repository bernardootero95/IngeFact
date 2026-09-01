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
    def __init__(self, response: dict | None = None, error: AlegraApiError | None = None):
        self._response = response
        self._error = error

    def create_invoice(self, payload: dict) -> dict:
        if self._error:
            raise self._error
        return self._response or {}

    def get_invoice(self, invoice_id: str) -> dict:
        if self._error:
            raise self._error
        return self._response or {}


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
