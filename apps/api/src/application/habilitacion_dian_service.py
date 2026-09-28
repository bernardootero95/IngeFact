import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error
from src.infrastructure.db.models import Empresa, HabilitacionDian

logger = logging.getLogger(__name__)

# tipo IngeFact -> `type` del set de pruebas / clave de governmentStatus en Alegra
TIPOS_ALEGRA = {"facturacion": "invoices", "nomina": "payrolls"}
NOMBRES_TIPO = {"facturacion": "factura electrónica", "nomina": "nómina electrónica"}

ESTADOS_GOBIERNO = {
    "AUTHORIZED": "habilitada",
    "IN_PROCESS": "en_proceso",
    "UNAUTHORIZED": "no_habilitada",
}
SETS_EN_CURSO = {"PENDING_TO_SEND", "WAITING_RESPONSE"}
CODIGO_SET_YA_APROBADO = "AEP4007"


class HabilitacionDianService:
    """Habilitacion DIAN del tenant (factura y nomina electronica). La fuente
    de verdad es `governmentStatus` de la empresa en Alegra; la tabla
    `habilitaciones_dian` la cachea y guarda el ultimo set de pruebas enviado."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(self, empresa_id: uuid.UUID) -> list[HabilitacionDian]:
        """Refresca contra Alegra y devuelve ambos tipos. Si Alegra no
        responde, devuelve lo que haya en cache en vez de romper la pantalla."""
        try:
            return self.sincronizar(empresa_id)
        except (AlegraApiError, AlegraTransientError) as exc:
            logger.warning("No se pudo sincronizar la habilitacion DIAN de %s: %s", empresa_id, exc)
            self.db.rollback()
            habilitaciones = [self._obtener_o_crear(empresa_id, tipo) for tipo in TIPOS_ALEGRA]
            self.db.commit()
            return habilitaciones

    def sincronizar(self, empresa_id: uuid.UUID) -> list[HabilitacionDian]:
        habilitaciones = [self._obtener_o_crear(empresa_id, tipo) for tipo in TIPOS_ALEGRA]
        empresa = self.db.get(Empresa, empresa_id)
        if empresa is None or not empresa.id_alegra:
            self.db.commit()
            return habilitaciones

        company = self._alegra_client.get_company(empresa.id_alegra)
        government_status = company.get("governmentStatus") or {}
        for habilitacion in habilitaciones:
            estado_gobierno = government_status.get(TIPOS_ALEGRA[habilitacion.tipo])
            habilitacion.estado = ESTADOS_GOBIERNO.get(estado_gobierno, "no_habilitada")
            if habilitacion.alegra_test_set_id and habilitacion.estado_set_pruebas in SETS_EN_CURSO:
                self._aplicar_test_set(habilitacion, self._alegra_client.get_test_set(habilitacion.alegra_test_set_id))
            self.db.add(habilitacion)
        self.db.commit()
        return habilitaciones

    def enviar_set_pruebas(self, empresa_id: uuid.UUID, tipo: str, test_set_id: str) -> HabilitacionDian:
        empresa = self.db.get(Empresa, empresa_id)
        if empresa is None or not empresa.id_alegra:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Tu empresa todavía no está habilitada para emitir documentos electrónicos. Escríbenos para activarla.",
            )

        habilitacion = self._obtener_o_crear(empresa_id, tipo)
        if habilitacion.estado == "habilitada":
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"Tu empresa ya está habilitada para {NOMBRES_TIPO[tipo]}."
            )

        try:
            test_set = self._alegra_client.create_test_set(empresa.id_alegra, TIPOS_ALEGRA[tipo], test_set_id)
        except AlegraApiError as exc:
            codigos = {err.get("code") for err in (exc.body.get("errors") or []) if isinstance(err, dict)}
            if CODIGO_SET_YA_APROBADO not in codigos:
                raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body)) from exc
            test_set = exc.body.get("approvedTestSet") or {"status": "ACCEPTED"}
        except AlegraTransientError as exc:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "El servicio de habilitación no respondió. Intenta de nuevo en unos minutos.",
            ) from exc

        habilitacion.test_set_id = test_set.get("governmentId") or test_set_id
        habilitacion.fecha_envio_set_pruebas = datetime.now(timezone.utc)
        self._aplicar_test_set(habilitacion, test_set)
        if test_set.get("status") == "ACCEPTED":
            habilitacion.estado = "habilitada"
        elif test_set.get("status") in SETS_EN_CURSO:
            habilitacion.estado = "en_proceso"
        self.db.add(habilitacion)
        self.db.commit()
        self.db.refresh(habilitacion)
        return habilitacion

    def verificar_habilitada(self, empresa_id: uuid.UUID, tipo: str) -> None:
        """Bloquea el envio a la DIAN si la empresa no esta habilitada para
        ese tipo. Con la cache en "habilitada" no consulta Alegra; si no, la
        refresca una vez (asi las empresas habilitadas antes de este modulo
        quedan en cache en su primer envio)."""
        habilitacion = self._obtener(empresa_id, tipo)
        if habilitacion is not None and habilitacion.estado == "habilitada":
            return

        try:
            self.sincronizar(empresa_id)
        except (AlegraApiError, AlegraTransientError) as exc:
            self.db.rollback()
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "No pudimos verificar tu habilitación ante la DIAN. Intenta de nuevo en unos minutos.",
            ) from exc

        habilitacion = self._obtener(empresa_id, tipo)
        if habilitacion is None or habilitacion.estado != "habilitada":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Tu empresa aún no está habilitada ante la DIAN para emitir {NOMBRES_TIPO[tipo]}. "
                "Complétala en Configuración > Habilitación DIAN.",
            )

    def _obtener(self, empresa_id: uuid.UUID, tipo: str) -> HabilitacionDian | None:
        return self.db.execute(
            select(HabilitacionDian).where(HabilitacionDian.empresa_id == empresa_id, HabilitacionDian.tipo == tipo)
        ).scalar_one_or_none()

    def _obtener_o_crear(self, empresa_id: uuid.UUID, tipo: str) -> HabilitacionDian:
        # ON CONFLICT DO NOTHING: dos requests simultaneos (ej. StrictMode) no
        # chocan contra el unique (empresa_id, tipo).
        self.db.execute(
            insert(HabilitacionDian)
            .values(id=uuid.uuid4(), empresa_id=empresa_id, tipo=tipo, estado="no_habilitada")
            .on_conflict_do_nothing(constraint="uq_habilitaciones_dian_empresa_tipo")
        )
        return self._obtener(empresa_id, tipo)

    @staticmethod
    def _aplicar_test_set(habilitacion: HabilitacionDian, test_set: dict) -> None:
        habilitacion.alegra_test_set_id = test_set.get("id") or habilitacion.alegra_test_set_id
        habilitacion.estado_set_pruebas = test_set.get("status")
        # Verificado en vivo: Alegra repite errores y a veces los manda vacios.
        errores = [e.strip() for e in (test_set.get("errors") or []) if isinstance(e, str) and e.strip()]
        habilitacion.errores_set_pruebas = list(dict.fromkeys(errores)) or None
