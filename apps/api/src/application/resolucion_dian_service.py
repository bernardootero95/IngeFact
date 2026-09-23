import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.core.alegra_client import AlegraApiError, AlegraClient
from src.application.consecutivo import revertir_consecutivo
from src.core.alegra_errors import map_alegra_error
from src.domain.resolucion_dian import (
    CargarResolucionAlegraResponse,
    GuardarResolucionDianRequest,
    ListaResolucionesAlegraResponse,
)
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
        """Upsert. El consecutivo se resetea a rango_minimo mientras no se
        haya incrementado todavia (consecutivo_actual == rango_minimo) --
        una vez `incrementar_consecutivo` avanzo el contador (Sprint 8,
        emision de facturas), ya no se toca solo en cada guardado, y
        rango_minimo queda bloqueado para edicion MIENTRAS la resolucion
        todavia tenga numeros disponibles (consecutivo_actual < rango_maximo).

        Una vez que el rango se agota, la DIAN exige cargar una resolucion
        nueva (otro numero_resolucion/prefijo/rango) -- cada factura ya
        emitida guarda su propio numero_completo/consecutivo (ver
        Factura.numero_completo), asi que reemplazar esta fila no corrompe
        la numeracion historica y se permite el cambio de rango (hallazgo
        2026-09-22: el bloqueo incondicional le impedia al tenant cargar la
        resolucion de renovacion cuando la anterior se agotaba).

        El tenant puede fijar `consecutivo_actual` a mano (caso real:
        resolucion que ya tenia documentos emitidos fuera de IngeFact antes
        de cargarla, ej. via "Cargar desde Alegra") -- una vez IngeFact ya
        incremento el contador emitiendo sus propios documentos dentro del
        rango vigente, no se permite retroceder (evita repetir numeracion ya
        usada), pero si avanzarlo."""
        resolucion = self.obtener(empresa_id)
        existia = resolucion is not None
        if resolucion is None:
            resolucion = ResolucionDian(empresa_id=empresa_id)
            consecutivo_iniciado = False
            agotada = False
        else:
            consecutivo_iniciado = resolucion.consecutivo_actual > resolucion.rango_minimo
            agotada = resolucion.consecutivo_actual >= resolucion.rango_maximo

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
        resolucion.technical_key = data.technical_key
        if data.consecutivo_actual is not None:
            resolucion.consecutivo_actual = data.consecutivo_actual
        elif not consecutivo_iniciado or cambia_rango:
            resolucion.consecutivo_actual = data.rango_minimo
        resolucion.estado_validacion = "pendiente"
        resolucion.mensaje_validacion = None

        self.db.add(resolucion)
        self.db.commit()
        self.db.refresh(resolucion)
        return resolucion

    def cargar_desde_alegra(self, empresa_id: uuid.UUID) -> ListaResolucionesAlegraResponse:
        """GET /resolutions/{nit} (solo produccion) -- trae TODAS las
        resoluciones que Alegra tiene registradas para el NIT del tenant
        (puede haber mas de una: la agotada/vencida y la de renovacion).
        Alegra no expone ningun campo de estado ni orden documentado (ver
        docstring de ListaResolucionesAlegraResponse), asi que no se adivina
        cual es la vigente -- se devuelven todas para que el tenant elija.
        No persiste nada; el tenant confirma con "Guardar Cambios" (mismo
        patron que "Consultar DIAN" en Clientes)."""
        empresa = self.db.get(Empresa, empresa_id)

        try:
            data = self._alegra_client.get_resolution(empresa.numero_identificacion)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc

        resoluciones = data.get("resolutions") or []
        if not resoluciones:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Alegra no tiene ninguna resolucion DIAN registrada todavia para esta empresa.",
            )

        return ListaResolucionesAlegraResponse(
            resoluciones=[
                CargarResolucionAlegraResponse(
                    numero_resolucion=r["resolutionNumber"],
                    prefijo=r["prefix"],
                    rango_minimo=r["minNumber"],
                    rango_maximo=r["maxNumber"],
                    fecha_inicio=r["startDate"],
                    fecha_fin=r["endDate"],
                    technical_key=r["technicalKey"],
                )
                for r in resoluciones
            ]
        )

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

    def revertir_consecutivo(self, empresa_id: uuid.UUID, consecutivo: int) -> bool:
        """Devuelve el numero obtenido con incrementar_consecutivo() cuando Alegra
        rechazo el envio con un 4xx (no creo ningun documento). Ver
        src/application/consecutivo.py para cuando es seguro y cuando no."""
        return revertir_consecutivo(
            self.db, ResolucionDian, consecutivo, ResolucionDian.empresa_id == empresa_id, empresa_id=empresa_id
        )
