import uuid

from sqlalchemy import func, update
from sqlalchemy.orm import Session

from src.infrastructure.db.models import MovimientoInventario, Producto

TIPOS_MOVIMIENTO = ("entrada", "salida")


class InventarioService:
    """Mueve el stock de un Producto (solo tipo='bien', los servicios no
    manejan inventario) y deja registro en `movimientos_inventario`. No
    sabe nada de Compras/Facturas -- CompraService y FacturaService lo
    llaman desde afuera, cada uno decidiendo cuando aplica."""

    def __init__(self, db: Session):
        self.db = db

    def registrar_movimiento(
        self,
        empresa_id: uuid.UUID,
        producto_id: uuid.UUID,
        tipo: str,
        cantidad: float,
        origen_tipo: str,
        origen_id: uuid.UUID | None = None,
    ) -> float | None:
        """UPDATE atomico de una sola sentencia (mismo patron que
        ResolucionDianService.incrementar_consecutivo) -- evita condiciones
        de carrera entre una Compra y una Factura concurrentes sobre el
        mismo producto. Sin `WHERE stock_actual >= cantidad` en la salida a
        proposito: la validacion de stock suficiente ya se hizo antes de
        llamar a Alegra (ver FacturaService.enviar) -- una vez que la DIAN
        aceptó el documento, el movimiento se registra igual aunque el
        stock quede en negativo (reflejar la realidad importa mas que
        bloquear un descuento tardio)."""
        assert tipo in TIPOS_MOVIMIENTO
        delta = cantidad if tipo == "entrada" else -cantidad

        resultado = self.db.execute(
            update(Producto)
            .where(Producto.id == producto_id, Producto.empresa_id == empresa_id)
            .values(stock_actual=func.coalesce(Producto.stock_actual, 0) + delta)
            .returning(Producto.stock_actual)
        )
        fila = resultado.first()
        if fila is None:
            return None
        saldo = float(fila[0])

        self.db.add(
            MovimientoInventario(
                empresa_id=empresa_id,
                producto_id=producto_id,
                tipo=tipo,
                cantidad=cantidad,
                origen_tipo=origen_tipo,
                origen_id=origen_id,
                saldo_resultante=saldo,
            )
        )
        self.db.commit()
        return saldo
