import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.domain.resolucion_documento_soporte import GuardarResolucionDocumentoSoporteRequest
from src.infrastructure.db.models import ResolucionDocumentoSoporte


class ResolucionDocumentoSoporteService:
    """Resolucion de numeracion DIAN de Documento Soporte del tenant -- una
    sola por empresa, mismo patron que ResolucionDianService pero sin
    cargar_desde_alegra/validar_ante_alegra (sin endpoint confirmado para
    eso todavia, ver docs/alegra-investigacion.md): se carga a mano."""

    def __init__(self, db: Session):
        self.db = db

    def obtener(self, empresa_id: uuid.UUID) -> ResolucionDocumentoSoporte | None:
        return self.db.execute(
            select(ResolucionDocumentoSoporte).where(ResolucionDocumentoSoporte.empresa_id == empresa_id)
        ).scalar_one_or_none()

    def obtener_o_404(self, empresa_id: uuid.UUID) -> ResolucionDocumentoSoporte:
        resolucion = self.obtener(empresa_id)
        if resolucion is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Esta empresa no tiene una Resolucion de Documento Soporte configurada."
            )
        return resolucion

    def guardar(
        self, empresa_id: uuid.UUID, data: GuardarResolucionDocumentoSoporteRequest
    ) -> ResolucionDocumentoSoporte:
        """Upsert, mismo criterio de bloqueo de rango/consecutivo que
        ResolucionDianService.guardar -- ver ese docstring."""
        resolucion = self.obtener(empresa_id)
        if resolucion is None:
            resolucion = ResolucionDocumentoSoporte(empresa_id=empresa_id)
            consecutivo_iniciado = False
        else:
            consecutivo_iniciado = resolucion.consecutivo_actual > resolucion.rango_minimo

        if consecutivo_iniciado and data.rango_minimo != resolucion.rango_minimo:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "No se puede modificar el rango minimo: ya se emitieron documentos con la numeracion actual.",
            )

        if consecutivo_iniciado and data.consecutivo_actual is not None:
            if data.consecutivo_actual < resolucion.consecutivo_actual:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "No se puede retroceder el consecutivo actual: ya se emitieron documentos con esta numeracion.",
                )

        resolucion.numero_resolucion = data.numero_resolucion
        resolucion.prefijo = data.prefijo
        resolucion.rango_minimo = data.rango_minimo
        resolucion.rango_maximo = data.rango_maximo
        resolucion.fecha_inicio = data.fecha_inicio
        resolucion.fecha_fin = data.fecha_fin
        if data.consecutivo_actual is not None:
            resolucion.consecutivo_actual = data.consecutivo_actual
        elif not consecutivo_iniciado:
            resolucion.consecutivo_actual = data.rango_minimo

        self.db.add(resolucion)
        self.db.commit()
        self.db.refresh(resolucion)
        return resolucion

    def incrementar_consecutivo(self, empresa_id: uuid.UUID) -> int:
        """UPDATE atomico de una sola sentencia, mismo patron que
        ResolucionDianService.incrementar_consecutivo."""
        resultado = self.db.execute(
            update(ResolucionDocumentoSoporte)
            .where(
                ResolucionDocumentoSoporte.empresa_id == empresa_id,
                ResolucionDocumentoSoporte.consecutivo_actual < ResolucionDocumentoSoporte.rango_maximo,
            )
            .values(consecutivo_actual=ResolucionDocumentoSoporte.consecutivo_actual + 1)
            .returning(ResolucionDocumentoSoporte.consecutivo_actual)
        )
        fila = resultado.first()
        self.db.commit()

        if fila is None:
            resolucion = self.obtener(empresa_id)
            if resolucion is None:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, "Esta empresa no tiene una Resolucion de Documento Soporte configurada."
                )
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Se agoto el rango de numeracion de la Resolucion de Documento Soporte configurada.",
            )
        return fila[0]
