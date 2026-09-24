import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.legal import VERSION_TERMINOS_VIGENTE
from src.infrastructure.db.models import AceptacionLegal

_MAX_USER_AGENT = 500


class AceptacionLegalService:
    """Registro y consulta de la aceptacion de terminos y politica de datos
    por parte de los usuarios tenant."""

    def __init__(self, db: Session):
        self.db = db

    def tiene_pendiente(self, usuario_id: uuid.UUID) -> bool:
        aceptada = self.db.execute(
            select(AceptacionLegal.id).where(
                AceptacionLegal.usuario_id == usuario_id,
                AceptacionLegal.version == VERSION_TERMINOS_VIGENTE,
            )
        ).first()
        return aceptada is None

    def aceptar(
        self,
        *,
        usuario_id: uuid.UUID,
        empresa_id: uuid.UUID,
        version: str,
        ip: str | None,
        user_agent: str | None,
    ) -> AceptacionLegal:
        # El cliente manda la version que le mostro al usuario: si no es la
        # vigente (pestana abierta desde antes de publicar una nueva), se
        # rechaza para no registrar aceptacion de un texto que no leyo.
        if version != VERSION_TERMINOS_VIGENTE:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Los terminos se actualizaron. Recarga la pagina para ver la version vigente.",
            )

        if not self.tiene_pendiente(usuario_id):
            return self.db.execute(
                select(AceptacionLegal).where(
                    AceptacionLegal.usuario_id == usuario_id,
                    AceptacionLegal.version == VERSION_TERMINOS_VIGENTE,
                )
            ).scalars().first()

        aceptacion = AceptacionLegal(
            usuario_id=usuario_id,
            empresa_id=empresa_id,
            version=version,
            ip=ip,
            user_agent=(user_agent or "")[:_MAX_USER_AGENT] or None,
        )
        self.db.add(aceptacion)
        self.db.commit()
        self.db.refresh(aceptacion)
        return aceptacion
