import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.application.consecutivo import revertir_consecutivo
from src.application.resoluciones_alegra import SIN_RESOLUCIONES, consultar_resoluciones_alegra
from src.core.alegra_client import AlegraClient
from src.domain.resolucion_documento_soporte import (
    GuardarResolucionDocumentoSoporteRequest,
    ListaResolucionesDocumentoSoporteAlegraResponse,
    ResolucionDocumentoSoporteAlegra,
)
from src.infrastructure.db.models import Empresa, ResolucionDocumentoSoporte

logger = logging.getLogger(__name__)


def _mapear_resolucion_alegra(r: dict) -> ResolucionDocumentoSoporteAlegra | None:
    try:
        return ResolucionDocumentoSoporteAlegra(
            numero_resolucion=str(r["resolutionNumber"]),
            prefijo=r.get("prefix") or "",
            rango_minimo=r["minNumber"],
            rango_maximo=r["maxNumber"],
            fecha_inicio=r["startDate"],
            fecha_fin=r["endDate"],
        )
    except (KeyError, ValueError) as exc:
        logger.warning("Resolucion de Alegra con formato inesperado, se omite: %s (%s)", r, exc)
        return None


class ResolucionDocumentoSoporteService:
    """Resolucion de numeracion DIAN de Documento Soporte del tenant -- una
    sola por empresa, mismo patron que ResolucionDianService. Sin
    validar_ante_alegra: Alegra no expone una validacion propia para este
    tipo de rango."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client

    def cargar_desde_alegra(self, empresa_id: uuid.UUID) -> ListaResolucionesDocumentoSoporteAlegraResponse:
        """Mismo GET /resolutions/{nit} que ResolucionDianService. La
        respuesta mezcla rangos de facturacion y de documento soporte sin
        un campo de tipo, asi que el unico indicio es `technicalKey` (los de
        documento soporte no lo traen): se listan primero los que no lo
        tienen, pero se devuelven todos para que el tenant elija -- no se
        descarta ninguno por una suposicion no verificada en produccion."""
        empresa = self.db.get(Empresa, empresa_id)
        crudas = consultar_resoluciones_alegra(
            self._alegra_client or AlegraClient(), empresa.numero_identificacion
        )
        crudas = sorted(crudas, key=lambda r: bool(r.get("technicalKey")))

        resoluciones = [r for r in (_mapear_resolucion_alegra(r) for r in crudas) if r]
        if not resoluciones:
            raise HTTPException(status.HTTP_404_NOT_FOUND, SIN_RESOLUCIONES)
        return ListaResolucionesDocumentoSoporteAlegraResponse(resoluciones=resoluciones)

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
        ResolucionDianService.guardar -- ver ese docstring (incluye permitir
        cargar una resolucion de renovacion, con rango distinto, una vez que
        la vigente se agota)."""
        resolucion = self.obtener(empresa_id)
        existia = resolucion is not None
        if resolucion is None:
            resolucion = ResolucionDocumentoSoporte(empresa_id=empresa_id)
            consecutivo_iniciado = False
            agotada = False
        else:
            consecutivo_iniciado = resolucion.consecutivo_actual > resolucion.rango_minimo
            # consecutivo_actual es el PROXIMO numero a usar (ver
            # incrementar_consecutivo) -- si es igual a rango_maximo todavia
            # queda ese ultimo numero disponible, solo esta agotada cuando
            # ya lo supera.
            agotada = resolucion.consecutivo_actual > resolucion.rango_maximo

        cambia_rango = existia and data.rango_minimo != resolucion.rango_minimo

        if consecutivo_iniciado and not agotada and cambia_rango:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "No se puede modificar el rango minimo: la resolucion actual "
                "todavia tiene numeros disponibles. Solo se puede cargar una "
                "resolucion nueva cuando la vigente se agota.",
            )

        if consecutivo_iniciado and not cambia_rango and data.consecutivo_actual is not None:
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
        elif not consecutivo_iniciado or cambia_rango:
            resolucion.consecutivo_actual = data.rango_minimo

        self.db.add(resolucion)
        self.db.commit()
        self.db.refresh(resolucion)
        return resolucion

    def incrementar_consecutivo(self, empresa_id: uuid.UUID) -> int:
        """UPDATE atomico de una sola sentencia, mismo patron que
        ResolucionDianService.incrementar_consecutivo -- ver ese docstring
        para el porque de RETURNING (consecutivo_actual - 1) y WHERE <=."""
        resultado = self.db.execute(
            update(ResolucionDocumentoSoporte)
            .where(
                ResolucionDocumentoSoporte.empresa_id == empresa_id,
                ResolucionDocumentoSoporte.consecutivo_actual <= ResolucionDocumentoSoporte.rango_maximo,
            )
            .values(consecutivo_actual=ResolucionDocumentoSoporte.consecutivo_actual + 1)
            .returning(ResolucionDocumentoSoporte.consecutivo_actual - 1)
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

    def revertir_consecutivo(self, empresa_id: uuid.UUID, consecutivo: int) -> bool:
        """Mismo criterio que ResolucionDianService.revertir_consecutivo."""
        return revertir_consecutivo(
            self.db,
            ResolucionDocumentoSoporte,
            consecutivo,
            ResolucionDocumentoSoporte.empresa_id == empresa_id,
            empresa_id=empresa_id,
            offset=1,
        )
