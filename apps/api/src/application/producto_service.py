import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.domain.factura_externa import ItemFacturaExternaRequest
from src.domain.producto import ActualizarProductoRequest, CrearProductoRequest
from src.infrastructure.db.models import Producto


class ProductoService:
    """CRUD del catalogo de productos/servicios de un tenant. Scoping por
    empresa_id siempre sale del JWT, nunca de un campo que mande el cliente."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, empresa_id: uuid.UUID, search: str | None = None) -> list[Producto]:
        query = (
            select(Producto)
            .where(Producto.empresa_id == empresa_id, Producto.eliminado.is_(None))
            .order_by(Producto.creado.desc())
        )
        if search:
            texto = f"%{search.strip()}%"
            query = query.where(or_(Producto.nombre.ilike(texto), Producto.codigo.ilike(texto)))
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, producto_id: uuid.UUID) -> Producto:
        producto = self.db.execute(
            select(Producto).where(
                Producto.id == producto_id, Producto.empresa_id == empresa_id, Producto.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if producto is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado.")
        return producto

    def _validar_codigo_unico(self, empresa_id: uuid.UUID, codigo: str, excluir_id: uuid.UUID | None = None) -> None:
        query = select(Producto).where(
            Producto.empresa_id == empresa_id, Producto.codigo == codigo, Producto.eliminado.is_(None)
        )
        if excluir_id is not None:
            query = query.where(Producto.id != excluir_id)
        if self.db.execute(query).scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un producto con ese codigo interno.")

    def crear(self, empresa_id: uuid.UUID, data: CrearProductoRequest) -> Producto:
        self._validar_codigo_unico(empresa_id, data.codigo)

        producto = Producto(empresa_id=empresa_id, **data.model_dump())
        self.db.add(producto)
        self.db.commit()
        self.db.refresh(producto)
        return producto

    def actualizar(self, empresa_id: uuid.UUID, producto_id: uuid.UUID, data: ActualizarProductoRequest) -> Producto:
        producto = self.obtener(empresa_id, producto_id)
        self._validar_codigo_unico(empresa_id, data.codigo, excluir_id=producto_id)

        for campo, valor in data.model_dump().items():
            setattr(producto, campo, valor)

        self.db.add(producto)
        self.db.commit()
        self.db.refresh(producto)
        return producto

    def eliminar(self, empresa_id: uuid.UUID, producto_id: uuid.UUID) -> None:
        producto = self.obtener(empresa_id, producto_id)
        producto.eliminado = datetime.now(timezone.utc)
        self.db.add(producto)
        self.db.commit()

    def obtener_o_crear(self, empresa_id: uuid.UUID, data: ItemFacturaExternaRequest) -> Producto:
        """Upsert por codigo -- usado por la API externa (/external/v1/facturas)
        para que un sistema externo pueda mandar el item de la linea inline
        (como lo recibe Alegra, sin catalogo previo) en vez de tener que
        pre-registrar un Producto. El empresa_id ya aisla el catalogo por
        tenant en todos los casos (lo use la web o la API externa), asi que
        no hay riesgo de cruce -- el criterio es mantener el catalogo
        sincronizado con lo ultimo que reporto el sistema externo."""
        existente = self.db.execute(
            select(Producto).where(
                Producto.empresa_id == empresa_id, Producto.codigo == data.codigo, Producto.eliminado.is_(None)
            )
        ).scalar_one_or_none()

        campos = {
            "tipo": data.tipo,
            "nombre": data.nombre,
            "descripcion": data.descripcion,
            "precio": data.precio_unitario,
            "unidad_medida": data.unidad_medida,
            "tributo": data.tributo,
            "tarifa_impuesto": data.tarifa_impuesto,
        }
        if existente is not None:
            for campo, valor in campos.items():
                setattr(existente, campo, valor)
            self.db.add(existente)
            self.db.commit()
            self.db.refresh(existente)
            return existente

        producto = Producto(empresa_id=empresa_id, codigo=data.codigo, **campos)
        self.db.add(producto)
        self.db.commit()
        self.db.refresh(producto)
        return producto
