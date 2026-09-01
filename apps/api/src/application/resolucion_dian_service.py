import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.core.alegra_client import AlegraApiError, AlegraClient
from src.core.alegra_errors import map_alegra_error
from src.domain.resolucion_dian import GuardarResolucionDianRequest
from src.infrastructure.db.models import Empresa, ResolucionDian


class ResolucionDianService:
    """Resolucion de numeracion DIAN del tenant -- una sola por empresa (sin
    historial/multiples, ver plan de Sprint 5). El consecutivo interno lo
    calcula y controla IngeFact, nunca el tenant."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def obtener(self, empresa_id: uuid.UUID) -> ResolucionDian | None:
        return self.db.execute(
            select(ResolucionDian).where(ResolucionDian.empresa_id == empresa_id)
        ).scalar_one_or_none()

    def obtener_o_404(self, empresa_id: uuid.UUID) -> ResolucionDian:
        resolucion = self.obtener(empresa_id)
        if resolucion is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Esta empresa no tiene una Resolucion DIAN configurada.")
        return resolucion

    def guardar(self, empresa_id: uuid.UUID, data: GuardarResolucionDianRequest) -> ResolucionDian:
        """Upsert. El consecutivo solo se resetea a rango_minimo mientras no
        se haya incrementado todavia (consecutivo_actual == rango_minimo) --
        una vez `incrementar_consecutivo` avanzo el contador (Sprint 8,
        emision de facturas), ya no se toca en cada guardado para no repetir
        numeracion ya usada, y rango_minimo queda bloqueado para edicion."""
        resolucion = self.obtener(empresa_id)
        if resolucion is None:
            resolucion = ResolucionDian(empresa_id=empresa_id)
            consecutivo_iniciado = False
        else:
            consecutivo_iniciado = resolucion.consecutivo_actual > resolucion.rango_minimo

        if consecutivo_iniciado and data.rango_minimo != resolucion.rango_minimo:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "No se puede modificar el rango minimo: ya se emitieron documentos con la numeracion actual.",
            )

        resolucion.numero_resolucion = data.numero_resolucion
        resolucion.prefijo = data.prefijo
        resolucion.rango_minimo = data.rango_minimo
        resolucion.rango_maximo = data.rango_maximo
        resolucion.fecha_inicio = data.fecha_inicio
        resolucion.fecha_fin = data.fecha_fin
        resolucion.technical_key = data.technical_key
        if not consecutivo_iniciado:
            resolucion.consecutivo_actual = data.rango_minimo
        resolucion.estado_validacion = "pendiente"
        resolucion.mensaje_validacion = None

        self.db.add(resolucion)
        self.db.commit()
        self.db.refresh(resolucion)
        return resolucion

    def validar_ante_alegra(self, empresa_id: uuid.UUID) -> ResolucionDian:
        resolucion = self.obtener_o_404(empresa_id)
        empresa = self.db.get(Empresa, empresa_id)

        try:
            self._alegra_client.get_resolution(empresa.numero_identificacion)
        except AlegraApiError as exc:
            resolucion.estado_validacion = "error"
            resolucion.mensaje_validacion = map_alegra_error(exc.status_code, exc.body)
        else:
            resolucion.estado_validacion = "validada"
            resolucion.mensaje_validacion = None

        resolucion.fecha_ultima_validacion = datetime.now(timezone.utc)
        self.db.add(resolucion)
        self.db.commit()
        self.db.refresh(resolucion)
        return resolucion

    def incrementar_consecutivo(self, empresa_id: uuid.UUID) -> int:
        """UPDATE atomico de una sola sentencia -- Postgres serializa las
        filas en conflicto sin necesidad de un SELECT ... FOR UPDATE
        explicito. Pensado para que Sprint 8 (emision de facturas) solo
        tenga que llamarlo; no se expone por ruta todavia porque no hay
        nada que lo dispare en este sprint."""
        resultado = self.db.execute(
            update(ResolucionDian)
            .where(
                ResolucionDian.empresa_id == empresa_id,
                ResolucionDian.consecutivo_actual < ResolucionDian.rango_maximo,
            )
            .values(consecutivo_actual=ResolucionDian.consecutivo_actual + 1)
            .returning(ResolucionDian.consecutivo_actual)
        )
        fila = resultado.first()
        self.db.commit()

        if fila is None:
            resolucion = self.obtener(empresa_id)
            if resolucion is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Esta empresa no tiene una Resolucion DIAN configurada.")
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Se agoto el rango de numeracion de la Resolucion DIAN configurada."
            )
        return fila[0]
