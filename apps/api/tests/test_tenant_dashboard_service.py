from datetime import date, datetime, timezone

from src.application.tenant_dashboard_service import TenantDashboardService
from src.domain.tenant_dashboard import rango_mes, rango_mes_anterior
from src.infrastructure.db.models import Cliente, Empresa, Factura, Producto

HOY = date(2026, 11, 23)


def _crear_empresa(db_session, nit="900618467") -> Empresa:
    empresa = Empresa(
        razon_social="Empresa Demo SAS",
        numero_identificacion=nit,
        digito_verificacion="4",
        correo_electronico=f"{nit}@example.com",
        estado="activo",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_cliente(db_session, empresa_id) -> Cliente:
    cliente = Cliente(
        empresa_id=empresa_id,
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        nombre="Cliente de prueba",
        correo_electronico="cliente@example.com",
    )
    db_session.add(cliente)
    db_session.commit()
    return cliente


def _crear_factura(db_session, empresa_id, cliente_id, *, fecha, total, estado="aceptada", eliminado=None):
    db_session.add(
        Factura(
            empresa_id=empresa_id,
            cliente_id=cliente_id,
            fecha=fecha,
            estado=estado,
            total=total,
            eliminado=eliminado,
        )
    )
    db_session.commit()


def _producto(empresa_id, codigo, eliminado=None) -> Producto:
    return Producto(
        empresa_id=empresa_id,
        codigo=codigo,
        nombre=f"Producto {codigo}",
        precio=1000,
        unidad_medida="94",
        eliminado=eliminado,
    )


def test_rango_mes_y_mes_anterior_cruzan_el_anio():
    assert rango_mes(date(2026, 12, 31)) == (date(2026, 12, 1), date(2027, 1, 1))
    assert rango_mes_anterior(date(2026, 1, 15)) == (date(2025, 12, 1), date(2026, 1, 1))
    assert rango_mes_anterior(date(2026, 3, 31)) == (date(2026, 2, 1), date(2026, 3, 1))


def test_facturacion_del_mes_solo_cuenta_aceptadas_del_mes(db_session):
    empresa = _crear_empresa(db_session)
    cliente = _crear_cliente(db_session, empresa.id)
    _crear_factura(db_session, empresa.id, cliente.id, fecha=date(2026, 11, 1), total=100_000)
    _crear_factura(db_session, empresa.id, cliente.id, fecha=date(2026, 11, 30), total=50_500.5)
    _crear_factura(db_session, empresa.id, cliente.id, fecha=date(2026, 11, 10), total=9_999, estado="enviada")
    _crear_factura(db_session, empresa.id, cliente.id, fecha=date(2026, 11, 10), total=9_999, estado="anulada")
    _crear_factura(db_session, empresa.id, cliente.id, fecha=date(2026, 11, 10), total=9_999, estado="borrador")
    _crear_factura(
        db_session, empresa.id, cliente.id, fecha=date(2026, 11, 10), total=9_999, eliminado=datetime.now(timezone.utc)
    )
    _crear_factura(db_session, empresa.id, cliente.id, fecha=date(2026, 12, 1), total=9_999)
    _crear_factura(db_session, empresa.id, cliente.id, fecha=date(2026, 10, 31), total=20_000)

    kpis = TenantDashboardService(db_session).obtener(empresa.id, HOY)

    assert kpis.facturas_emitidas_mes == 2
    assert kpis.facturacion_mes.cantidad == 2
    assert kpis.facturacion_mes.total == 150_500.5
    assert kpis.facturacion_mes_anterior.cantidad == 1
    assert kpis.facturacion_mes_anterior.total == 20_000
    assert kpis.tiene_facturas is True


def test_empresa_sin_facturas_ni_productos(db_session):
    empresa = _crear_empresa(db_session)

    kpis = TenantDashboardService(db_session).obtener(empresa.id, HOY)

    assert kpis.facturacion_mes.cantidad == 0
    assert kpis.facturacion_mes.total == 0
    assert kpis.facturacion_mes_anterior.cantidad == 0
    assert kpis.productos_registrados == 0
    assert kpis.tiene_facturas is False


def test_no_mezcla_datos_de_otra_empresa(db_session):
    empresa_a = _crear_empresa(db_session, nit="900618467")
    empresa_b = _crear_empresa(db_session, nit="900618468")
    cliente = _crear_cliente(db_session, empresa_a.id)
    _crear_factura(db_session, empresa_a.id, cliente.id, fecha=date(2026, 11, 5), total=100_000)
    db_session.add(_producto(empresa_a.id, "P1"))
    db_session.commit()

    kpis = TenantDashboardService(db_session).obtener(empresa_b.id, HOY)

    assert kpis.facturacion_mes.cantidad == 0
    assert kpis.productos_registrados == 0
    assert kpis.tiene_facturas is False


def test_productos_registrados_excluye_eliminados(db_session):
    empresa = _crear_empresa(db_session)
    db_session.add(_producto(empresa.id, "P1"))
    db_session.add(_producto(empresa.id, "P2", eliminado=datetime.now(timezone.utc)))
    db_session.commit()

    kpis = TenantDashboardService(db_session).obtener(empresa.id, HOY)

    assert kpis.productos_registrados == 1
