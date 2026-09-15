import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error, map_government_response
from src.domain.factura_recibida import (
    TIPO_RECLAMO,
    TIPOS_QUE_REQUIEREN_GENERADOR,
    CrearEventoReceptorRequest,
    CrearFacturaRecibidaRequest,
)
from src.infrastructure.db.models import Empresa, EventoReceptor, FacturaRecibida, Proveedor


class FacturaRecibidaService:
    """Registro de facturas RECIBIDAS de proveedores (el tenant como
    comprador) + los eventos DIAN sobre ellas (acuse de recibo, reclamo,
    recibo del bien/servicio, aceptacion expresa/tacita). Scoping por
    empresa_id siempre sale del JWT, nunca de un campo que mande el
    cliente -- mismo criterio que el resto de servicios /tenant/*.

    A diferencia de Factura, esto NO se envia a Alegra como documento propio
    -- solo se registra el CUFE (dato real que el proveedor le da al
    tenant) y, cuando aplica, se llama a Alegra para registrar un evento
    sobre esa factura via su CUFE (ver AlegraClient.register_receiver_event).
    """

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID | None = None) -> list[FacturaRecibida]:
        query = (
            select(FacturaRecibida)
            .where(FacturaRecibida.empresa_id == empresa_id, FacturaRecibida.eliminado.is_(None))
            .options(selectinload(FacturaRecibida.proveedor), selectinload(FacturaRecibida.eventos))
            .order_by(FacturaRecibida.creado.desc())
        )
        if proveedor_id:
            query = query.where(FacturaRecibida.proveedor_id == proveedor_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, factura_recibida_id: uuid.UUID) -> FacturaRecibida:
        factura_recibida = self.db.execute(
            select(FacturaRecibida)
            .where(
                FacturaRecibida.id == factura_recibida_id,
                FacturaRecibida.empresa_id == empresa_id,
                FacturaRecibida.eliminado.is_(None),
            )
            .options(selectinload(FacturaRecibida.proveedor), selectinload(FacturaRecibida.eventos))
        ).scalar_one_or_none()
        if factura_recibida is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura recibida no encontrada.")
        return factura_recibida

    def _validar_proveedor(self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID) -> Proveedor:
        proveedor = self.db.execute(
            select(Proveedor).where(
                Proveedor.id == proveedor_id, Proveedor.empresa_id == empresa_id, Proveedor.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if proveedor is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado.")
        return proveedor

    def crear(self, empresa_id: uuid.UUID, data: CrearFacturaRecibidaRequest) -> FacturaRecibida:
        self._validar_proveedor(empresa_id, data.proveedor_id)

        existente = self.db.execute(
            select(FacturaRecibida).where(
                FacturaRecibida.empresa_id == empresa_id,
                FacturaRecibida.cufe == data.cufe,
                FacturaRecibida.eliminado.is_(None),
            )
        ).scalar_one_or_none()
        if existente is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya registraste una factura recibida con ese CUFE.")

        factura_recibida = FacturaRecibida(
            empresa_id=empresa_id,
            proveedor_id=data.proveedor_id,
            cufe=data.cufe,
            numero_documento_proveedor=data.numero_documento_proveedor,
            fecha=data.fecha,
            monto_total=data.monto_total,
            observaciones=data.observaciones,
        )
        self.db.add(factura_recibida)
        self.db.commit()
        self.db.refresh(factura_recibida)
        return self.obtener(empresa_id, factura_recibida.id)

    def eliminar(self, empresa_id: uuid.UUID, factura_recibida_id: uuid.UUID) -> None:
        factura_recibida = self.obtener(empresa_id, factura_recibida_id)
        factura_recibida.eliminado = datetime.now(timezone.utc)
        self.db.add(factura_recibida)
        self.db.commit()

    @staticmethod
    def _generar_numero_evento() -> str:
        """Numero alfanumerico propio del evento -- Alegra no exige que sea
        secuencial ni valida unicidad contra un registro DIAN como si pasa
        con el consecutivo de Factura (verificado en Fase 4: reenviar el
        mismo `number` dos veces no dio conflicto), asi que no hace falta un
        contador atomico, basta con que sea unico en la practica."""
        return f"EVT{uuid.uuid4().hex[:10].upper()}"

    def _construir_payload_evento(
        self, empresa: Empresa, factura_recibida: FacturaRecibida, numero: str, data: CrearEventoReceptorRequest
    ) -> dict:
        payload = {
            "type": data.tipo,
            "number": numero,
            "uuid": factura_recibida.cufe,
            "companyId": empresa.id_alegra,
        }
        if data.tipo in TIPOS_QUE_REQUIEREN_GENERADOR and data.generador:
            issuer_party = {
                "identificationType": data.generador.tipo_identificacion,
                "identificationNumber": data.generador.numero_identificacion,
                "firstName": data.generador.nombres,
                "familyName": data.generador.apellidos,
            }
            if data.generador.dv:
                issuer_party["dv"] = data.generador.dv
            if data.generador.cargo:
                issuer_party["jobTitle"] = data.generador.cargo
            payload["issuerParty"] = issuer_party
        if data.tipo == TIPO_RECLAMO:
            payload["claimCode"] = data.claim_code
            if data.notas:
                payload["notes"] = [data.notas]
        return payload

    def registrar_evento(
        self, empresa_id: uuid.UUID, factura_recibida_id: uuid.UUID, data: CrearEventoReceptorRequest
    ) -> FacturaRecibida:
        factura_recibida = self.obtener(empresa_id, factura_recibida_id)
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.id_alegra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta empresa aun no esta registrada en Alegra.")

        numero = self._generar_numero_evento()
        payload = self._construir_payload_evento(empresa, factura_recibida, numero, data)

        try:
            respuesta = self._alegra_client.register_receiver_event(payload)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc
        except AlegraTransientError as exc:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Alegra no esta respondiendo en este momento. Intenta de nuevo en unos minutos.",
            ) from exc

        event = respuesta.get("event") or {}
        government_response = event.get("governmentResponse") or {}
        legal_status = event.get("legalStatus")

        evento = EventoReceptor(
            factura_recibida_id=factura_recibida.id,
            tipo=data.tipo,
            numero=numero,
            legal_status=legal_status,
            cude=event.get("cude"),
            claim_code=data.claim_code if data.tipo == TIPO_RECLAMO else None,
            notas=data.notas,
            generador_tipo_identificacion=data.generador.tipo_identificacion if data.generador else None,
            generador_numero_identificacion=data.generador.numero_identificacion if data.generador else None,
            generador_dv=data.generador.dv if data.generador else None,
            generador_nombres=data.generador.nombres if data.generador else None,
            generador_apellidos=data.generador.apellidos if data.generador else None,
            generador_cargo=data.generador.cargo if data.generador else None,
            notificaciones_dian=government_response.get("errorMessages") or None,
            razon_rechazo=(
                map_government_response(government_response.get("code", ""), government_response.get("message") or "")
                if legal_status == "REJECTED"
                else None
            ),
        )
        self.db.add(evento)
        self.db.commit()

        return self.obtener(empresa_id, factura_recibida.id)
