import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.inventario_service import InventarioService
from src.domain.compra import CrearCompraRequest, LineaCompraRequest
from src.infrastructure.db.models import Compra, CompraLinea, Empresa, Producto, Proveedor


class CompraService:
    """Registro interno de Compras a proveedores. Scoping por empresa_id
    siempre sale del JWT (tenant.empresa_id), nunca de un campo que mande el
    cliente -- mismo criterio que FacturaService. A diferencia de Factura,
    no hay envio a Alegra ni estados intermedios: se registra directo como
    'registrada' y solo puede pasar a 'anulada'."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, empresa_id: uuid.UUID, estado: str | None = None, proveedor_id: uuid.UUID | None = None) -> list[Compra]:
        query = (
            select(Compra)
            .where(Compra.empresa_id == empresa_id, Compra.eliminado.is_(None))
            .options(selectinload(Compra.proveedor))
            .order_by(Compra.creado.desc())
        )
        if estado:
            query = query.where(Compra.estado == estado)
        if proveedor_id:
            query = query.where(Compra.proveedor_id == proveedor_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, compra_id: uuid.UUID) -> Compra:
        compra = self.db.execute(
            select(Compra)
            .where(Compra.id == compra_id, Compra.empresa_id == empresa_id, Compra.eliminado.is_(None))
            .options(selectinload(Compra.proveedor), selectinload(Compra.lineas))
        ).scalar_one_or_none()
        if compra is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Compra no encontrada.")
        return compra

    def _validar_proveedor(self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID) -> Proveedor:
        proveedor = self.db.execute(
            select(Proveedor).where(
                Proveedor.id == proveedor_id, Proveedor.empresa_id == empresa_id, Proveedor.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if proveedor is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado.")
        return proveedor

    def _construir_lineas(self, empresa_id: uuid.UUID, lineas_data: list[LineaCompraRequest]) -> list[CompraLinea]:
        lineas = []
        for linea_data in lineas_data:
            producto = self.db.execute(
                select(Producto).where(
                    Producto.id == linea_data.producto_id,
                    Producto.empresa_id == empresa_id,
                    Producto.eliminado.is_(None),
                )
            ).scalar_one_or_none()
            if producto is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"Producto {linea_data.producto_id} no encontrado.")
            if producto.tipo != "bien":
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"'{producto.nombre}' es un servicio -- las compras solo admiten productos (bienes), "
                    "los servicios no manejan inventario.",
                )

            cantidad = linea_data.cantidad
            precio_unitario = (
                float(linea_data.precio_unitario) if linea_data.precio_unitario is not None else float(producto.precio)
            )
            tarifa = float(producto.tarifa_impuesto)
            subtotal_linea = round(cantidad * precio_unitario, 2)
            impuesto_linea = round(subtotal_linea * tarifa / 100, 2)

            lineas.append(
                CompraLinea(
                    producto_id=producto.id,
                    codigo=producto.codigo,
                    descripcion=producto.descripcion or producto.nombre,
                    unidad_medida=producto.unidad_medida,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    tributo=producto.tributo,
                    tarifa_impuesto=tarifa,
                    subtotal_linea=subtotal_linea,
                    impuesto_linea=impuesto_linea,
                    total_linea=subtotal_linea + impuesto_linea,
                )
            )
        return lineas

    @staticmethod
    def _totales(lineas: list[CompraLinea]) -> tuple[float, float, float]:
        subtotal = round(sum(float(linea.subtotal_linea) for linea in lineas), 2)
        total_impuestos = round(sum(float(linea.impuesto_linea) for linea in lineas), 2)
        return subtotal, total_impuestos, round(subtotal + total_impuestos, 2)

    def _mover_inventario(self, empresa_id: uuid.UUID, compra: Compra, tipo: str) -> None:
        """`tipo='entrada'` al registrar la compra, `tipo='salida'` para
        revertir ese mismo movimiento si se anula/elimina -- todas las
        lineas de una Compra son 'bien' por construccion (_construir_lineas
        rechaza servicios), asi que no hace falta filtrar aqui de nuevo."""
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.inventario_habilitado:
            return
        inventario = InventarioService(self.db)
        for linea in compra.lineas:
            inventario.registrar_movimiento(
                empresa_id=empresa_id,
                producto_id=linea.producto_id,
                tipo=tipo,
                cantidad=float(linea.cantidad),
                origen_tipo="compra",
                origen_id=compra.id,
            )

    def crear(self, empresa_id: uuid.UUID, data: CrearCompraRequest) -> Compra:
        self._validar_proveedor(empresa_id, data.proveedor_id)
        lineas = self._construir_lineas(empresa_id, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        compra = Compra(
            empresa_id=empresa_id,
            proveedor_id=data.proveedor_id,
            fecha=data.fecha,
            numero_documento_proveedor=data.numero_documento_proveedor,
            observaciones=data.observaciones,
            estado="registrada",
            subtotal=subtotal,
            total_impuestos=total_impuestos,
            total=total,
            lineas=lineas,
        )
        self.db.add(compra)
        self.db.commit()
        self.db.refresh(compra)
        compra = self.obtener(empresa_id, compra.id)
        self._mover_inventario(empresa_id, compra, "entrada")
        return compra

    def anular(self, empresa_id: uuid.UUID, compra_id: uuid.UUID) -> Compra:
        compra = self.obtener(empresa_id, compra_id)
        if compra.estado == "anulada":
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta compra ya esta anulada.")
        # Revierte el stock que esta compra habia sumado -- antes de marcarla
        # anulada, para no perder las lineas ya cargadas por selectinload.
        self._mover_inventario(empresa_id, compra, "salida")
        compra.estado = "anulada"
        self.db.add(compra)
        self.db.commit()
        self.db.refresh(compra)
        return compra

    def eliminar(self, empresa_id: uuid.UUID, compra_id: uuid.UUID) -> None:
        compra = self.obtener(empresa_id, compra_id)
        # Si ya estaba anulada el stock ya se revirtio en anular() -- no
        # reversar dos veces.
        if compra.estado == "registrada":
            self._mover_inventario(empresa_id, compra, "salida")
        compra.eliminado = datetime.now(timezone.utc)
        self.db.add(compra)
        self.db.commit()
