from src.application.inventario_service import InventarioService
from src.infrastructure.db.models import Empresa, MovimientoInventario, Producto


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


def _crear_producto(db_session, empresa_id, **overrides) -> Producto:
    data = {
        "empresa_id": empresa_id,
        "codigo": "PROD-001",
        "nombre": "Producto de prueba",
        "precio": 1000,
        "unidad_medida": "94",
    }
    data.update(overrides)
    producto = Producto(**data)
    db_session.add(producto)
    db_session.commit()
    db_session.refresh(producto)
    return producto


def test_entrada_suma_stock_desde_none(db_session):
    empresa = _crear_empresa(db_session)
    producto = _crear_producto(db_session, empresa.id)
    assert producto.stock_actual is None

    saldo = InventarioService(db_session).registrar_movimiento(
        empresa_id=empresa.id, producto_id=producto.id, tipo="entrada", cantidad=10, origen_tipo="compra"
    )

    assert saldo == 10
    db_session.refresh(producto)
    assert float(producto.stock_actual) == 10


def test_salida_resta_stock_y_puede_quedar_negativo(db_session):
    empresa = _crear_empresa(db_session)
    producto = _crear_producto(db_session, empresa.id)
    inventario = InventarioService(db_session)
    inventario.registrar_movimiento(empresa.id, producto.id, "entrada", 5, "compra")

    saldo = inventario.registrar_movimiento(empresa.id, producto.id, "salida", 8, "factura")

    assert saldo == -3
    db_session.refresh(producto)
    assert float(producto.stock_actual) == -3


def test_registra_historial_con_saldo_resultante(db_session):
    empresa = _crear_empresa(db_session)
    producto = _crear_producto(db_session, empresa.id)
    inventario = InventarioService(db_session)

    inventario.registrar_movimiento(empresa.id, producto.id, "entrada", 10, "compra", origen_id=None)
    inventario.registrar_movimiento(empresa.id, producto.id, "salida", 4, "factura")

    movimientos = (
        db_session.query(MovimientoInventario)
        .filter(MovimientoInventario.producto_id == producto.id)
        .order_by(MovimientoInventario.creado)
        .all()
    )
    assert len(movimientos) == 2
    assert movimientos[0].tipo == "entrada"
    assert float(movimientos[0].saldo_resultante) == 10
    assert movimientos[1].tipo == "salida"
    assert float(movimientos[1].saldo_resultante) == 6


def test_producto_de_otro_tenant_no_se_mueve(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    producto_b = _crear_producto(db_session, empresa_b.id)

    saldo = InventarioService(db_session).registrar_movimiento(
        empresa_id=empresa_a.id, producto_id=producto_b.id, tipo="entrada", cantidad=5, origen_tipo="compra"
    )

    assert saldo is None
    db_session.refresh(producto_b)
    assert producto_b.stock_actual is None
