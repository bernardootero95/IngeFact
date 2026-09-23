import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.domain.empleado import ActualizarEmpleadoRequest, CrearEmpleadoRequest
from src.infrastructure.db.models import Empleado


class EmpleadoService:
    """CRUD del directorio de empleados de un tenant (Nomina Electronica,
    Fase 5). Scoping por empresa_id siempre sale del JWT (CurrentTenant),
    mismo criterio que ClienteService/ProveedorService."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, empresa_id: uuid.UUID, search: str | None = None) -> list[Empleado]:
        query = (
            select(Empleado)
            .where(Empleado.empresa_id == empresa_id, Empleado.eliminado.is_(None))
            .order_by(Empleado.creado.desc())
        )
        if search:
            texto = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Empleado.primer_nombre.ilike(texto),
                    Empleado.primer_apellido.ilike(texto),
                    Empleado.numero_documento.ilike(texto),
                )
            )
        return list(self.db.execute(query).scalars().all())

    def contar(self, empresa_id: uuid.UUID) -> int:
        return self.db.execute(
            select(func.count()).select_from(Empleado).where(
                Empleado.empresa_id == empresa_id, Empleado.eliminado.is_(None)
            )
        ).scalar_one()

    def obtener(self, empresa_id: uuid.UUID, empleado_id: uuid.UUID) -> Empleado:
        empleado = self.db.execute(
            select(Empleado).where(
                Empleado.id == empleado_id, Empleado.empresa_id == empresa_id, Empleado.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if empleado is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Empleado no encontrado.")
        return empleado

    def _validar_documento_unico(
        self, empresa_id: uuid.UUID, tipo_documento: str, numero_documento: str, excluir_id: uuid.UUID | None = None
    ) -> None:
        query = select(Empleado).where(
            Empleado.empresa_id == empresa_id,
            Empleado.tipo_documento == tipo_documento,
            Empleado.numero_documento == numero_documento,
            Empleado.eliminado.is_(None),
        )
        if excluir_id is not None:
            query = query.where(Empleado.id != excluir_id)
        if self.db.execute(query).scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un empleado con ese documento de identidad.")

    def crear(self, empresa_id: uuid.UUID, data: CrearEmpleadoRequest) -> Empleado:
        self._validar_documento_unico(empresa_id, data.tipo_documento, data.numero_documento)

        empleado = Empleado(empresa_id=empresa_id, **data.model_dump())
        self.db.add(empleado)
        self.db.commit()
        self.db.refresh(empleado)
        return empleado

    def actualizar(self, empresa_id: uuid.UUID, empleado_id: uuid.UUID, data: ActualizarEmpleadoRequest) -> Empleado:
        empleado = self.obtener(empresa_id, empleado_id)
        self._validar_documento_unico(
            empresa_id, data.tipo_documento, data.numero_documento, excluir_id=empleado_id
        )

        for campo, valor in data.model_dump().items():
            setattr(empleado, campo, valor)

        self.db.add(empleado)
        self.db.commit()
        self.db.refresh(empleado)
        return empleado

    def eliminar(self, empresa_id: uuid.UUID, empleado_id: uuid.UUID) -> None:
        empleado = self.obtener(empresa_id, empleado_id)
        empleado.eliminado = datetime.now(timezone.utc)
        self.db.add(empleado)
        self.db.commit()
