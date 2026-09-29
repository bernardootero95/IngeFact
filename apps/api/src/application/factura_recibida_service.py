import base64
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.suscripcion_service import revisar_alerta_cuota_sin_romper, verificar_cupo_disponible
from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error, map_government_response
from src.core.factura_ubl_parser import (
    FORMA_PAGO_CREDITO,
    FORMA_PAGO_LABELS,
    FacturaUblInvalida,
    ResumenFacturaUbl,
    parsear_factura_ubl,
)
from src.domain.factura_recibida import (
    ESTADOS_EVENTO_ACEPTADO,
    TIPO_ACEPTACION_EXPRESA,
    TIPO_RECIBO_BIEN,
    TIPO_RECLAMO,
    TIPOS_QUE_REQUIEREN_GENERADOR,
    ConsultaFacturaRecibidaResponse,
    CrearEventoReceptorRequest,
    CrearFacturaRecibidaRequest,
    XmlFacturaRecibidaResponse,
    eventos_permitidos,
)
from src.infrastructure.db.models import Empresa, EventoReceptor, FacturaRecibida, Proveedor

MENSAJE_ALEGRA_NO_RESPONDE = (
    "El servicio de facturación electrónica no está respondiendo en este momento. Intenta de nuevo en unos minutos."
)
MENSAJE_ORDEN_GENERICO = "Ese evento no se puede registrar en el estado actual de la factura."
MENSAJES_ORDEN_EVENTO = {
    TIPO_RECIBO_BIEN: "Primero registra el acuse de recibo de la factura.",
    TIPO_ACEPTACION_EXPRESA: "Primero registra el recibo de la mercancía o servicio.",
    TIPO_RECLAMO: "Primero registra el recibo de la mercancía o servicio.",
}


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

    def _consultar_dian(self, cufe: str) -> tuple[dict, ResumenFacturaUbl]:
        """Pide a Alegra el documento que la DIAN tiene para ese CUFE y lee
        su XML. Devuelve la respuesta cruda (para el XML) y el resumen."""
        try:
            respuesta = self._alegra_client.get_document_by_track_id(cufe)
        except AlegraApiError as exc:
            if exc.status_code == 404:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, "La DIAN no tiene registrada ninguna factura con ese CUFE."
                ) from exc
            raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc
        except AlegraTransientError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, MENSAJE_ALEGRA_NO_RESPONDE) from exc

        if respuesta.get("dianStatus") != "AUTHORIZED":
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Esa factura no está autorizada por la DIAN, no se le pueden registrar eventos.",
            )
        contenido = (respuesta.get("xmlDocument") or {}).get("content")
        if not contenido:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY, "La DIAN no devolvió el XML de la factura. Intenta de nuevo en unos minutos."
            )
        try:
            resumen = parsear_factura_ubl(base64.b64decode(contenido))
        except (FacturaUblInvalida, ValueError) as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
        return respuesta, resumen

    def _motivo_bloqueo(self, empresa: Empresa, cufe: str, resumen: ResumenFacturaUbl) -> str | None:
        if resumen.forma_pago != FORMA_PAGO_CREDITO:
            return (
                "Esta factura es de contado. La DIAN solo permite registrar eventos (acuse, recibo y "
                "aceptación) sobre facturas a crédito, por eso no se carga."
            )
        if resumen.adquiriente_nit and resumen.adquiriente_nit != empresa.numero_identificacion:
            return "Esta factura no fue emitida a tu empresa (el NIT del comprador es otro), así que no puedes registrarla."
        if self._buscar_por_cufe(empresa.id, cufe) is not None:
            return "Ya registraste esta factura."
        return None

    def _buscar_por_cufe(self, empresa_id: uuid.UUID, cufe: str) -> FacturaRecibida | None:
        return self.db.execute(
            select(FacturaRecibida).where(
                FacturaRecibida.empresa_id == empresa_id,
                FacturaRecibida.cufe == cufe,
                FacturaRecibida.eliminado.is_(None),
            )
        ).scalar_one_or_none()

    def _empresa(self, empresa_id: uuid.UUID) -> Empresa:
        empresa = self.db.get(Empresa, empresa_id)
        if empresa is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Empresa no encontrada.")
        return empresa

    def consultar(self, empresa_id: uuid.UUID, cufe: str) -> ConsultaFacturaRecibidaResponse:
        cufe = CrearFacturaRecibidaRequest(cufe=cufe).cufe
        _, resumen = self._consultar_dian(cufe)
        motivo = self._motivo_bloqueo(self._empresa(empresa_id), cufe, resumen)
        return ConsultaFacturaRecibidaResponse(
            cufe=cufe,
            numero=resumen.numero,
            proveedor_nombre=resumen.proveedor_nombre,
            proveedor_nit=resumen.proveedor_nit,
            fecha=resumen.fecha,
            fecha_vencimiento=resumen.fecha_vencimiento,
            forma_pago=resumen.forma_pago,
            forma_pago_label=FORMA_PAGO_LABELS.get(resumen.forma_pago or "", "Sin dato"),
            total=resumen.total,
            puede_registrar=motivo is None,
            motivo_bloqueo=motivo,
        )

    def crear(self, empresa_id: uuid.UUID, data: CrearFacturaRecibidaRequest) -> FacturaRecibida:
        # Se vuelve a consultar a la DIAN en vez de confiar en lo que el
        # cliente vio en la vista previa.
        _, resumen = self._consultar_dian(data.cufe)
        motivo = self._motivo_bloqueo(self._empresa(empresa_id), data.cufe, resumen)
        if motivo:
            raise HTTPException(status.HTTP_409_CONFLICT, motivo)

        proveedor = self.db.execute(
            select(Proveedor).where(
                Proveedor.empresa_id == empresa_id,
                Proveedor.numero_identificacion == resumen.proveedor_nit,
                Proveedor.eliminado.is_(None),
            )
        ).scalar_one_or_none()

        factura_recibida = FacturaRecibida(
            empresa_id=empresa_id,
            proveedor_id=proveedor.id if proveedor else None,
            proveedor_nombre=resumen.proveedor_nombre,
            proveedor_nit=resumen.proveedor_nit,
            cufe=data.cufe,
            numero_documento_proveedor=resumen.numero,
            fecha=resumen.fecha,
            fecha_vencimiento=resumen.fecha_vencimiento,
            forma_pago=resumen.forma_pago,
            monto_total=resumen.total,
        )
        self.db.add(factura_recibida)
        self.db.commit()
        self.db.refresh(factura_recibida)
        return self.obtener(empresa_id, factura_recibida.id)

    def obtener_xml(self, empresa_id: uuid.UUID, factura_recibida_id: uuid.UUID) -> XmlFacturaRecibidaResponse:
        """El XML no se guarda: se vuelve a pedir a la DIAN (via Alegra) cada
        vez, igual que el XML de las facturas emitidas."""
        factura_recibida = self.obtener(empresa_id, factura_recibida_id)
        respuesta, _ = self._consultar_dian(factura_recibida.cufe)
        numero = factura_recibida.numero_documento_proveedor or factura_recibida.cufe[:16]
        return XmlFacturaRecibidaResponse(
            nombre_archivo=f"{numero}.xml",
            contenido_base64=respuesta["xmlDocument"]["content"],
        )

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
        if data.tipo not in eventos_permitidos(factura_recibida.eventos):
            raise HTTPException(status.HTTP_409_CONFLICT, MENSAJES_ORDEN_EVENTO.get(data.tipo, MENSAJE_ORDEN_GENERICO))
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.id_alegra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Tu empresa todavía no está habilitada para emitir documentos electrónicos. Escríbenos para activarla.")
        # Cada evento aceptado descuenta un documento del paquete (decision de
        # negocio 2026-09-24, ver contar_documentos_usados).
        verificar_cupo_disponible(self.db, empresa_id)

        numero = self._generar_numero_evento()
        payload = self._construir_payload_evento(empresa, factura_recibida, numero, data)

        try:
            respuesta = self._alegra_client.register_receiver_event(payload)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc
        except AlegraTransientError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, MENSAJE_ALEGRA_NO_RESPONDE) from exc

        event =respuesta.get("event") or {}
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
        if legal_status in ESTADOS_EVENTO_ACEPTADO:
            revisar_alerta_cuota_sin_romper(self.db, empresa_id)

        return self.obtener(empresa_id, factura_recibida.id)
