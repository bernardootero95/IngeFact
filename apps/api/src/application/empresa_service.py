import logging
import time
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error
from src.core.config import get_settings
from src.domain.empresa import CrearEmpresaRequest
from src.infrastructure.db.models import CompanyStatus, Empresa

logger = logging.getLogger(__name__)

# Intento inicial + hasta 5 reintentos con backoff exponencial (1,2,4,8,16s).
BACKOFF_SECONDS = [1, 2, 4, 8, 16]


class CreateEmpresaAlegraService:
    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self.alegra = alegra_client or AlegraClient()

    def _log_status(self, empresa_id: uuid.UUID, estado: str, detalle: dict | None = None) -> None:
        self.db.add(CompanyStatus(empresa_id=empresa_id, estado=estado, detalle=detalle))
        self.db.commit()

    @staticmethod
    def _build_alegra_payload(data: CrearEmpresaRequest) -> dict:
        return {
            "name": data.razon_social,
            "tradeName": data.nombre_comercial or data.razon_social,
            "identification": data.numero_identificacion,
            "dv": data.digito_verificacion,
            "useAlegraCertificate": True,
            "identificationType": data.tipo_identificacion,
            "email": data.correo_electronico,
            "phone": data.telefono or "",
            "organizationType": int(data.tipo_organizacion) if data.tipo_organizacion else 1,
            "regimeCode": data.regimen,
            "address": {
                "address": data.direccion or "No registrada",
                "department": data.departamento or "11",
                "city": data.municipio or "11001",
                "country": "CO",
            },
        }

    def crear(self, data: CrearEmpresaRequest) -> Empresa:
        existente = (
            self.db.query(Empresa).filter(Empresa.numero_identificacion == data.numero_identificacion).one_or_none()
        )
        if existente is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una empresa con ese NIT.")

        empresa = Empresa(
            razon_social=data.razon_social,
            nombre_comercial=data.nombre_comercial,
            numero_identificacion=data.numero_identificacion,
            digito_verificacion=data.digito_verificacion,
            tipo_identificacion=data.tipo_identificacion,
            direccion=data.direccion,
            departamento=data.departamento,
            municipio=data.municipio,
            regimen=data.regimen,
            tipo_organizacion=data.tipo_organizacion,
            telefono=data.telefono,
            correo_electronico=data.correo_electronico,
            notificacion_correo=data.notificacion_correo,
            estado="creando",
        )
        self.db.add(empresa)
        self.db.commit()
        self.db.refresh(empresa)

        self._provisionar_en_alegra(empresa, data)
        self.db.refresh(empresa)
        return empresa

    def reintentar(self, empresa_id: uuid.UUID) -> Empresa:
        empresa = self.db.get(Empresa, empresa_id)
        if empresa is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Empresa no encontrada.")
        if empresa.estado != "error_alegra":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Esta empresa no esta en estado de error.")

        data = CrearEmpresaRequest(
            razon_social=empresa.razon_social,
            nombre_comercial=empresa.nombre_comercial,
            numero_identificacion=empresa.numero_identificacion,
            digito_verificacion=empresa.digito_verificacion,
            tipo_identificacion=empresa.tipo_identificacion,
            direccion=empresa.direccion,
            departamento=empresa.departamento,
            municipio=empresa.municipio,
            regimen=empresa.regimen,
            tipo_organizacion=empresa.tipo_organizacion,
            telefono=empresa.telefono,
            correo_electronico=empresa.correo_electronico,
            notificacion_correo=empresa.notificacion_correo,
        )
        self._provisionar_en_alegra(empresa, data)
        self.db.refresh(empresa)
        return empresa

    def _provisionar_en_alegra(self, empresa: Empresa, data: CrearEmpresaRequest) -> None:
        """Llama a Alegra (con reintentos), guarda el resultado y crea el test set en sandbox."""
        alegra_payload = self._build_alegra_payload(data)

        try:
            alegra_company = self._crear_en_alegra_con_reintentos(empresa.id, alegra_payload)
        except AlegraApiError as exc:
            mensaje = map_alegra_error(exc.status_code, exc.body)
            empresa.estado = "error_alegra"
            self.db.add(empresa)
            self._log_status(empresa.id, "error_alegra", {"status_code": exc.status_code, "body": exc.body})
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, mensaje) from exc
        except AlegraTransientError as exc:
            empresa.estado = "error_alegra"
            self.db.add(empresa)
            self._log_status(empresa.id, "error_alegra", {"detalle": str(exc)})
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Alegra no respondio tras varios intentos. Usa el reintento manual en unos minutos.",
            ) from exc

        empresa.id_alegra = alegra_company["id"]
        empresa.estado = "activo"
        self.db.add(empresa)
        self._log_status(empresa.id, "creado_en_alegra", {"company_id": alegra_company["id"]})

        if get_settings().alegra_env == "sandbox":
            self._crear_test_set(empresa)

    def _crear_en_alegra_con_reintentos(self, empresa_id: uuid.UUID, payload: dict) -> dict:
        last_error: AlegraTransientError | None = None
        for attempt, wait_seconds in enumerate([0, *BACKOFF_SECONDS], start=1):
            if wait_seconds:
                time.sleep(wait_seconds)
            try:
                self._log_status(empresa_id, "intentando_alegra", {"intento": attempt})
                return self.alegra.create_company(payload)
            except AlegraApiError:
                raise
            except AlegraTransientError as exc:
                last_error = exc
                logger.warning("Intento %s de crear empresa en Alegra fallo: %s", attempt, exc)
                continue
        raise last_error or AlegraTransientError("Fallo desconocido tras reintentos")

    def _crear_test_set(self, empresa: Empresa) -> None:
        try:
            test_set = self.alegra.create_test_set(empresa.id_alegra)
            self._log_status(empresa.id, "test_set_creado", test_set)
        except (AlegraApiError, AlegraTransientError) as exc:
            # No bloquea la creacion de la empresa -- se loguea para revisar a mano.
            detalle = exc.body if isinstance(exc, AlegraApiError) else str(exc)
            self._log_status(empresa.id, "test_set_fallido", {"detalle": detalle})
            logger.error("No se pudo crear el test set para %s: %s", empresa.id_alegra, exc)
