from datetime import date

import pytest
from fastapi import HTTPException

from src.application.documento_soporte_service import DocumentoSoporteService
from src.core.alegra_client import AlegraApiError
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
    def __init__(self, response: dict | None = None, error: AlegraApiError | None = None):
        self._response = response
        self._error = error
        self.last_payload = None

    def create_support_document(self, payload: dict) -> dict:
        self.last_payload = payload
        if self._error:
            raise self._error
        return self._response or {}


def test_crear_borrador_calcula_totales_y_no_asigna_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = DocumentoSoporteService(db_session)

    documento = service.crear_borrador(empresa.id, _payload(proveedor.id, producto.id))

    assert documento.estado == "borrador"
    assert documento.consecutivo is None
    assert float(documento.subtotal) == 200000
    assert float(documento.total_impuestos) == 38000
    assert float(documento.total) == 238000
    assert len(documento.lineas) == 1
    assert documento.lineas[0].descripcion == producto.nombre


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
