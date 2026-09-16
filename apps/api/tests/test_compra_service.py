import base64
import uuid
from pathlib import Path

import pytest
from fastapi import HTTPException

from src.application.compra_service import CompraService
from src.core.alegra_client import AlegraApiError
from src.domain.compra import CrearCompraRequest, LineaCompraRequest
from src.infrastructure.db.models import Empresa, Producto, Proveedor

FIXTURE_XML = (Path(__file__).parent / "fixtures" / "factura_ubl_sample.xml").read_bytes()


class _FakeAlegraClient:
    def __init__(self, response: dict | None = None, error: AlegraApiError | None = None):
        self._response = response
        self._error = error

    def get_by_track_id(self, track_id: str) -> dict:
        if self._error:
            raise self._error
        return self._response or {}


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_proveedor(db_session, empresa_id, **overrides) -> Proveedor:
    data = {
        "empresa_id": empresa_id,
        "tipo_identificacion": "13",
        "numero_identificacion": "1000000000",
        "nombre": "Proveedor de prueba",
        "correo_electronico": "proveedor@example.com",
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


def _payload(proveedor_id, producto_id, **overrides) -> CrearCompraRequest:
    from datetime import date

    data = {
        "proveedor_id": proveedor_id,
        "fecha": date.today(),
        "lineas": [LineaCompraRequest(producto_id=producto_id, cantidad=2)],
    }
    data.update(overrides)
    return CrearCompraRequest(**data)


def test_crear_calcula_totales_en_servidor(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)

    compra = service.crear(empresa.id, _payload(proveedor.id, producto.id))

    assert compra.estado == "registrada"
    assert float(compra.subtotal) == 200000
    assert float(compra.total_impuestos) == 38000
    assert float(compra.total) == 238000
    assert len(compra.lineas) == 1
    assert compra.lineas[0].descripcion == producto.nombre
    assert compra.lineas[0].codigo == producto.codigo


def test_crear_con_precio_unitario_override(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)

    compra = service.crear(
        empresa.id,
        _payload(
            proveedor.id,
            producto.id,
            lineas=[LineaCompraRequest(producto_id=producto.id, cantidad=1, precio_unitario=50000)],
        ),
    )

    assert float(compra.subtotal) == 50000


def test_crear_proveedor_de_otro_tenant_falla_404(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    proveedor_b = _crear_proveedor(db_session, empresa_b.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    service = CompraService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa_a.id, _payload(proveedor_b.id, producto_a.id))
    assert exc_info.value.status_code == 404


def test_crear_producto_de_otro_tenant_falla_404(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    proveedor_a = _crear_proveedor(db_session, empresa_a.id)
    producto_b = _crear_producto(db_session, empresa_b.id)
    service = CompraService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa_a.id, _payload(proveedor_a.id, producto_b.id))
    assert exc_info.value.status_code == 404


def test_listar_filtra_por_estado_y_proveedor(db_session):
    empresa = _crear_empresa(db_session)
    proveedor_1 = _crear_proveedor(db_session, empresa.id, numero_identificacion="1000000000")
    proveedor_2 = _crear_proveedor(db_session, empresa.id, numero_identificacion="2000000000")
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)
    compra_1 = service.crear(empresa.id, _payload(proveedor_1.id, producto.id))
    service.crear(empresa.id, _payload(proveedor_2.id, producto.id))
    service.anular(empresa.id, compra_1.id)

    assert len(service.listar(empresa.id)) == 2
    assert len(service.listar(empresa.id, proveedor_id=proveedor_1.id)) == 1
    assert len(service.listar(empresa.id, estado="anulada")) == 1
    assert len(service.listar(empresa.id, estado="registrada")) == 1


def test_anular_cambia_estado_y_es_idempotente_con_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)
    compra = service.crear(empresa.id, _payload(proveedor.id, producto.id))

    anulada = service.anular(empresa.id, compra.id)
    assert anulada.estado == "anulada"

    with pytest.raises(HTTPException) as exc_info:
        service.anular(empresa.id, compra.id)
    assert exc_info.value.status_code == 409


def test_eliminar_es_soft_delete(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)
    compra = service.crear(empresa.id, _payload(proveedor.id, producto.id))

    service.eliminar(empresa.id, compra.id)

    assert service.listar(empresa.id) == []
    with pytest.raises(HTTPException):
        service.obtener(empresa.id, compra.id)


def test_obtener_404_si_es_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    proveedor_a = _crear_proveedor(db_session, empresa_a.id)
    producto_a = _crear_producto(db_session, empresa_a.id)
    service = CompraService(db_session)
    compra = service.crear(empresa_a.id, _payload(proveedor_a.id, producto_a.id))

    with pytest.raises(HTTPException) as exc_info:
        service.obtener(empresa_b.id, compra.id)
    assert exc_info.value.status_code == 404

    with pytest.raises(HTTPException):
        service.obtener(empresa_a.id, uuid.uuid4())


def test_rechaza_lineas_de_servicios(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    servicio = _crear_producto(db_session, empresa.id, tipo="servicio", codigo="SERV-001")
    service = CompraService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, _payload(proveedor.id, servicio.id))
    assert exc_info.value.status_code == 400
    assert "servicio" in exc_info.value.detail.lower()


def test_crear_no_mueve_inventario_si_esta_deshabilitado(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)

    service.crear(empresa.id, _payload(proveedor.id, producto.id))

    db_session.refresh(producto)
    assert producto.stock_actual is None


def test_crear_suma_stock_si_inventario_habilitado(db_session):
    empresa = _crear_empresa(db_session, inventario_habilitado=True)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)

    service.crear(empresa.id, _payload(proveedor.id, producto.id, lineas=[LineaCompraRequest(producto_id=producto.id, cantidad=5)]))

    db_session.refresh(producto)
    assert float(producto.stock_actual) == 5


def test_anular_revierte_el_stock_sumado(db_session):
    empresa = _crear_empresa(db_session, inventario_habilitado=True)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)
    compra = service.crear(
        empresa.id, _payload(proveedor.id, producto.id, lineas=[LineaCompraRequest(producto_id=producto.id, cantidad=5)])
    )
    db_session.refresh(producto)
    assert float(producto.stock_actual) == 5

    service.anular(empresa.id, compra.id)

    db_session.refresh(producto)
    assert float(producto.stock_actual) == 0


def test_eliminar_revierte_el_stock_si_estaba_registrada(db_session):
    empresa = _crear_empresa(db_session, inventario_habilitado=True)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)
    compra = service.crear(
        empresa.id, _payload(proveedor.id, producto.id, lineas=[LineaCompraRequest(producto_id=producto.id, cantidad=3)])
    )

    service.eliminar(empresa.id, compra.id)

    db_session.refresh(producto)
    assert float(producto.stock_actual) == 0


def test_crear_con_cufe_lo_persiste(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)

    compra = service.crear(empresa.id, _payload(proveedor.id, producto.id, cufe="cufe-real-123"))

    assert compra.cufe == "cufe-real-123"


def test_crear_con_cufe_duplicado_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)
    service.crear(empresa.id, _payload(proveedor.id, producto.id, cufe="cufe-repetido"))

    with pytest.raises(HTTPException) as exc_info:
        service.crear(empresa.id, _payload(proveedor.id, producto.id, cufe="cufe-repetido"))
    assert exc_info.value.status_code == 409


def test_consultar_cufe_no_encontrado_falla_404(db_session):
    service = CompraService(db_session, alegra_client=_FakeAlegraClient(error=AlegraApiError(404, {})))

    with pytest.raises(HTTPException) as exc_info:
        service.consultar_cufe(uuid.uuid4(), "cufe-inexistente")
    assert exc_info.value.status_code == 404


def test_consultar_cufe_sin_xml_devuelve_solo_encabezado(db_session):
    """Caso real de un proveedor externo: Alegra no tiene custodia del XML
    -- solo trae el resumen del documento (fecha/monto), sin lineas ni
    proveedor sugerido (ver hallazgo Fase 5)."""
    empresa = _crear_empresa(db_session)
    fake = _FakeAlegraClient(
        response={
            "dianStatus": "AUTHORIZED",
            "document": {
                "documentDate": "2026-09-01",
                "documentNumber": "FE-123",
                "subtotal": 100000,
                "taxTotal": 19000,
                "total": 119000,
            },
        }
    )
    service = CompraService(db_session, alegra_client=fake)

    resultado = service.consultar_cufe(empresa.id, "cufe-sin-custodia")

    assert str(resultado.fecha) == "2026-09-01"
    assert resultado.numero_documento_proveedor == "FE-123"
    assert resultado.monto_referencia.total == 119000
    assert resultado.proveedor_sugerido is None
    assert resultado.lineas is None


def test_consultar_cufe_con_xml_devuelve_lineas_y_proveedor_sugerido(db_session):
    empresa = _crear_empresa(db_session)
    fake = _FakeAlegraClient(
        response={
            "dianStatus": "AUTHORIZED",
            "document": {"documentDate": "2026-09-01", "documentNumber": "FE-123", "total": 119000},
            "xmlDocument": {"format": "base64", "content": base64.b64encode(FIXTURE_XML).decode("ascii")},
        }
    )
    service = CompraService(db_session, alegra_client=fake)

    resultado = service.consultar_cufe(empresa.id, "cufe-con-custodia")

    assert resultado.lineas is not None
    assert len(resultado.lineas) == 1
    assert resultado.lineas[0].descripcion == "Servicio de Consultoria Sprint 8"
    assert resultado.proveedor_sugerido is not None
    assert resultado.proveedor_sugerido.numero_identificacion == "900559088"
    assert resultado.proveedor_sugerido.proveedor_id_existente is None


def test_consultar_cufe_autoselecciona_proveedor_ya_registrado(db_session):
    empresa = _crear_empresa(db_session)
    proveedor = _crear_proveedor(db_session, empresa.id, tipo_identificacion="31", numero_identificacion="900559088")
    fake = _FakeAlegraClient(
        response={
            "dianStatus": "AUTHORIZED",
            "document": {"documentDate": "2026-09-01", "total": 119000},
            "xmlDocument": {"format": "base64", "content": base64.b64encode(FIXTURE_XML).decode("ascii")},
        }
    )
    service = CompraService(db_session, alegra_client=fake)

    resultado = service.consultar_cufe(empresa.id, "cufe-con-custodia")

    assert resultado.proveedor_sugerido.proveedor_id_existente == str(proveedor.id)


def test_eliminar_no_revierte_dos_veces_si_ya_estaba_anulada(db_session):
    empresa = _crear_empresa(db_session, inventario_habilitado=True)
    proveedor = _crear_proveedor(db_session, empresa.id)
    producto = _crear_producto(db_session, empresa.id)
    service = CompraService(db_session)
    compra = service.crear(
        empresa.id, _payload(proveedor.id, producto.id, lineas=[LineaCompraRequest(producto_id=producto.id, cantidad=3)])
    )
    service.anular(empresa.id, compra.id)

    service.eliminar(empresa.id, compra.id)

    db_session.refresh(producto)
    assert float(producto.stock_actual) == 0
