import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.domain.cliente import ActualizarClienteRequest, CrearClienteRequest
from src.infrastructure.db.models import Cliente


class ClienteService:
    """CRUD del directorio de clientes de un tenant. Scoping por empresa_id
    siempre sale del JWT (CurrentTenant), nunca de un campo que mande el
    cliente -- mismo criterio que el resto de rutas /tenant/*."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, empresa_id: uuid.UUID, search: str | None = None) -> list[Cliente]:
        query = (
            select(Cliente)
            .where(Cliente.empresa_id == empresa_id, Cliente.eliminado.is_(None))
            .order_by(Cliente.creado.desc())
        )
        if search:
            texto = f"%{search.strip()}%"
            query = query.where(or_(Cliente.nombre.ilike(texto), Cliente.numero_identificacion.ilike(texto)))
        return list(self.db.execute(query).scalars().all())

    def contar(self, empresa_id: uuid.UUID) -> int:
        return self.db.execute(
            select(func.count()).select_from(Cliente).where(
                Cliente.empresa_id == empresa_id, Cliente.eliminado.is_(None)
            )
        ).scalar_one()

    def obtener(self, empresa_id: uuid.UUID, cliente_id: uuid.UUID) -> Cliente:
        cliente = self.db.execute(
            select(Cliente).where(
                Cliente.id == cliente_id, Cliente.empresa_id == empresa_id, Cliente.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if cliente is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado.")
        return cliente

    def _validar_documento_unico(
        self, empresa_id: uuid.UUID, numero_identificacion: str, excluir_id: uuid.UUID | None = None
    ) -> None:
        query = select(Cliente).where(
            Cliente.empresa_id == empresa_id,
            Cliente.numero_identificacion == numero_identificacion,
            Cliente.eliminado.is_(None),
        )
        if excluir_id is not None:
            query = query.where(Cliente.id != excluir_id)
        if self.db.execute(query).scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un cliente con ese numero de identificacion.")

    def crear(self, empresa_id: uuid.UUID, data: CrearClienteRequest) -> Cliente:
        self._validar_documento_unico(empresa_id, data.numero_identificacion)

        cliente = Cliente(empresa_id=empresa_id, **data.model_dump())
        self.db.add(cliente)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente

    def actualizar(self, empresa_id: uuid.UUID, cliente_id: uuid.UUID, data: ActualizarClienteRequest) -> Cliente:
        cliente = self.obtener(empresa_id, cliente_id)
        self._validar_documento_unico(empresa_id, data.numero_identificacion, excluir_id=cliente_id)

        for campo, valor in data.model_dump().items():
            setattr(cliente, campo, valor)

        self.db.add(cliente)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente

    def eliminar(self, empresa_id: uuid.UUID, cliente_id: uuid.UUID) -> None:
        cliente = self.obtener(empresa_id, cliente_id)
        cliente.eliminado = datetime.now(timezone.utc)
        self.db.add(cliente)
        self.db.commit()
