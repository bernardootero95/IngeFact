import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.domain.proveedor import ActualizarProveedorRequest, CrearProveedorRequest
from src.infrastructure.db.models import Proveedor


class ProveedorService:
    """CRUD del directorio de proveedores de un tenant. Scoping por
    empresa_id siempre sale del JWT (CurrentTenant), nunca de un campo que
    mande el cliente -- mismo criterio que ClienteService."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, empresa_id: uuid.UUID, search: str | None = None) -> list[Proveedor]:
        query = (
            select(Proveedor)
            .where(Proveedor.empresa_id == empresa_id, Proveedor.eliminado.is_(None))
            .order_by(Proveedor.creado.desc())
        )
        if search:
            texto = f"%{search.strip()}%"
            query = query.where(or_(Proveedor.nombre.ilike(texto), Proveedor.numero_identificacion.ilike(texto)))
        return list(self.db.execute(query).scalars().all())

    def contar(self, empresa_id: uuid.UUID) -> int:
        return self.db.execute(
            select(func.count()).select_from(Proveedor).where(
                Proveedor.empresa_id == empresa_id, Proveedor.eliminado.is_(None)
            )
        ).scalar_one()

    def obtener(self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID) -> Proveedor:
        proveedor = self.db.execute(
            select(Proveedor).where(
                Proveedor.id == proveedor_id, Proveedor.empresa_id == empresa_id, Proveedor.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if proveedor is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado.")
        return proveedor

    def _validar_documento_unico(
        self, empresa_id: uuid.UUID, numero_identificacion: str, excluir_id: uuid.UUID | None = None
    ) -> None:
        query = select(Proveedor).where(
            Proveedor.empresa_id == empresa_id,
            Proveedor.numero_identificacion == numero_identificacion,
            Proveedor.eliminado.is_(None),
        )
        if excluir_id is not None:
            query = query.where(Proveedor.id != excluir_id)
        if self.db.execute(query).scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proveedor con ese numero de identificacion.")

    def crear(self, empresa_id: uuid.UUID, data: CrearProveedorRequest) -> Proveedor:
        self._validar_documento_unico(empresa_id, data.numero_identificacion)

        proveedor = Proveedor(empresa_id=empresa_id, **data.model_dump())
        self.db.add(proveedor)
        self.db.commit()
        self.db.refresh(proveedor)
        return proveedor

    def actualizar(
        self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID, data: ActualizarProveedorRequest
    ) -> Proveedor:
        proveedor = self.obtener(empresa_id, proveedor_id)
        self._validar_documento_unico(empresa_id, data.numero_identificacion, excluir_id=proveedor_id)

        for campo, valor in data.model_dump().items():
            setattr(proveedor, campo, valor)

        self.db.add(proveedor)
        self.db.commit()
        self.db.refresh(proveedor)
        return proveedor

    def eliminar(self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID) -> None:
        proveedor = self.obtener(empresa_id, proveedor_id)
        proveedor.eliminado = datetime.now(timezone.utc)
        self.db.add(proveedor)
        self.db.commit()
