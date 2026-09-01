import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.impuesto_empresa import ActualizarImpuestoEmpresaRequest, CrearImpuestoEmpresaRequest
from src.infrastructure.db.models import ImpuestoEmpresa


class ImpuestoEmpresaService:
    """CRUD de los presets de tributo+tarifa que un tenant configura para
    asignarlos luego a sus productos (ver ProductoService)."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, empresa_id: uuid.UUID) -> list[ImpuestoEmpresa]:
        query = (
            select(ImpuestoEmpresa)
            .where(ImpuestoEmpresa.empresa_id == empresa_id, ImpuestoEmpresa.eliminado.is_(None))
            .order_by(ImpuestoEmpresa.creado.desc())
        )
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, impuesto_id: uuid.UUID) -> ImpuestoEmpresa:
        impuesto = self.db.execute(
            select(ImpuestoEmpresa).where(
                ImpuestoEmpresa.id == impuesto_id,
                ImpuestoEmpresa.empresa_id == empresa_id,
                ImpuestoEmpresa.eliminado.is_(None),
            )
        ).scalar_one_or_none()
        if impuesto is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Impuesto no encontrado.")
        return impuesto

    def _validar_preset_unico(
        self, empresa_id: uuid.UUID, tributo: str, tarifa: float, excluir_id: uuid.UUID | None = None
    ) -> None:
        query = select(ImpuestoEmpresa).where(
            ImpuestoEmpresa.empresa_id == empresa_id,
            ImpuestoEmpresa.tributo == tributo,
            ImpuestoEmpresa.tarifa == tarifa,
            ImpuestoEmpresa.eliminado.is_(None),
        )
        if excluir_id is not None:
            query = query.where(ImpuestoEmpresa.id != excluir_id)
        if self.db.execute(query).scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya tienes configurado ese tributo con esa tarifa.")

    def crear(self, empresa_id: uuid.UUID, data: CrearImpuestoEmpresaRequest) -> ImpuestoEmpresa:
        self._validar_preset_unico(empresa_id, data.tributo, data.tarifa)

        impuesto = ImpuestoEmpresa(empresa_id=empresa_id, **data.model_dump())
        self.db.add(impuesto)
        self.db.commit()
        self.db.refresh(impuesto)
        return impuesto

    def actualizar(
        self, empresa_id: uuid.UUID, impuesto_id: uuid.UUID, data: ActualizarImpuestoEmpresaRequest
    ) -> ImpuestoEmpresa:
        impuesto = self.obtener(empresa_id, impuesto_id)
        self._validar_preset_unico(empresa_id, data.tributo, data.tarifa, excluir_id=impuesto_id)

        impuesto.tributo = data.tributo
        impuesto.tarifa = data.tarifa
        self.db.add(impuesto)
        self.db.commit()
        self.db.refresh(impuesto)
        return impuesto

    def eliminar(self, empresa_id: uuid.UUID, impuesto_id: uuid.UUID) -> None:
        impuesto = self.obtener(empresa_id, impuesto_id)
        impuesto.eliminado = datetime.now(timezone.utc)
        self.db.add(impuesto)
        self.db.commit()
