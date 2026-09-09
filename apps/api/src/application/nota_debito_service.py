import logging
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.factura_service import _construir_pago
from src.application.suscripcion_service import revisar_alerta_cuota_por_empresa
from src.core.alegra_client import AlegraApiError, AlegraClient
from src.core.alegra_errors import map_alegra_error, map_government_response
from src.core.nota_debito_pdf import generar_representacion_pdf_nota_debito
from src.core.xml_utils import extraer_firma_digital
from src.domain.nota_debito import ActualizarNotaDebitoRequest, CrearNotaDebitoRequest, LineaNotaDebitoRequest
from src.infrastructure.db.models import ConsecutivoNota, Empresa, Factura, NotaDebito, NotaDebitoLinea

logger = logging.getLogger(__name__)

PREFIJO_NOTA_DEBITO = "ND"


class NotaDebitoService:
    """CRUD de Notas Debito + envio a Alegra. A diferencia de
    NotaCreditoService, no trackea disponibilidad ni puede "anular" -- una
    nota debito agrega un cargo, no reduce nada de la factura original.
    Scoping por empresa_id siempre sale del JWT, mismo criterio que el
    resto de servicios tenant."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(
        self, empresa_id: uuid.UUID, estado: str | None = None, factura_id: uuid.UUID | None = None
    ) -> list[NotaDebito]:
        query = (
            select(NotaDebito)
            .where(NotaDebito.empresa_id == empresa_id, NotaDebito.eliminado.is_(None))
            .options(selectinload(NotaDebito.cliente), selectinload(NotaDebito.factura))
            .order_by(NotaDebito.creado.desc())
        )
        if estado:
            query = query.where(NotaDebito.estado == estado)
        if factura_id:
            query = query.where(NotaDebito.factura_id == factura_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> NotaDebito:
        nota = self.db.execute(
            select(NotaDebito)
            .where(NotaDebito.id == nota_id, NotaDebito.empresa_id == empresa_id, NotaDebito.eliminado.is_(None))
            .options(
                selectinload(NotaDebito.cliente), selectinload(NotaDebito.factura), selectinload(NotaDebito.lineas)
            )
        ).scalar_one_or_none()
        if nota is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Nota debito no encontrada.")
        return nota

    def obtener_url_xml(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> str:
        nota = self.obtener(empresa_id, nota_id)
        if not nota.alegra_debit_note_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta nota debito todavia no fue enviada a Alegra.")
        try:
            respuesta = self._alegra_client.get_debit_note(nota.alegra_debit_note_id)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body))
        url = (respuesta.get("files") or {}).get("xml")
        if not url:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Alegra no tiene un XML disponible para esta nota.")
        return url

    def obtener_firma_digital(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> str:
        nota = self.obtener(empresa_id, nota_id)
        if nota.firma_digital:
            return nota.firma_digital

        url = self.obtener_url_xml(empresa_id, nota_id)
        try:
            xml_bytes = self._alegra_client.fetch_raw(url)
            firma = extraer_firma_digital(xml_bytes)
        except (httpx.HTTPError, ET.ParseError) as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No se pudo obtener la firma digital del XML.") from exc

        if not firma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "El XML no contiene una firma digital.")

        nota.firma_digital = firma
        self.db.add(nota)
        self.db.commit()
        return firma

    def generar_pdf_representacion(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> bytes:
        """PDF real de la representacion grafica -- solo tiene sentido para
        una nota ya aceptada (CUDE/QR/firma real)."""
        nota = self.obtener(empresa_id, nota_id)
        if not nota.cude:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Solo se puede generar el PDF de una nota ya aceptada por la DIAN."
            )
        firma_digital = self.obtener_firma_digital(empresa_id, nota_id)
        return generar_representacion_pdf_nota_debito(self.db, nota, firma_digital)

    def _obtener_factura_aceptada(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> Factura:
        factura = self.db.execute(
            select(Factura)
            .where(Factura.id == factura_id, Factura.empresa_id == empresa_id, Factura.eliminado.is_(None))
            .options(selectinload(Factura.lineas), selectinload(Factura.cliente))
        ).scalar_one_or_none()
        if factura is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura no encontrada.")
        if factura.estado != "aceptada":
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Solo se pueden crear notas debito sobre facturas aceptadas por la DIAN."
            )
        return factura

    def _obtener_editable(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> NotaDebito:
        nota = self.obtener(empresa_id, nota_id)
        if nota.estado not in ("borrador", "rechazada"):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Solo se puede editar una nota debito en estado borrador o rechazada."
            )
        return nota

    def _construir_lineas(
        self, factura: Factura, lineas_data: list[LineaNotaDebitoRequest]
    ) -> list[NotaDebitoLinea]:
        factura_lineas_por_id = {linea.id: linea for linea in factura.lineas}

        lineas = []
        for linea_data in lineas_data:
            factura_linea = factura_lineas_por_id.get(linea_data.factura_linea_id)
            if factura_linea is None:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, f"La linea {linea_data.factura_linea_id} no pertenece a esta factura."
                )

            cantidad = linea_data.cantidad
            precio_unitario = float(factura_linea.precio_unitario)
            tarifa = float(factura_linea.tarifa_impuesto)
            subtotal_linea = round(cantidad * precio_unitario, 2)
            impuesto_linea = round(subtotal_linea * tarifa / 100, 2)

            lineas.append(
                NotaDebitoLinea(
                    factura_linea_id=factura_linea.id,
                    codigo=factura_linea.codigo,
                    descripcion=factura_linea.descripcion,
                    unidad_medida=factura_linea.unidad_medida,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    tributo=factura_linea.tributo,
                    tarifa_impuesto=tarifa,
                    subtotal_linea=subtotal_linea,
                    impuesto_linea=impuesto_linea,
                    total_linea=subtotal_linea + impuesto_linea,
                )
            )
        return lineas

    @staticmethod
    def _totales(lineas: list[NotaDebitoLinea]) -> tuple[float, float, float]:
        subtotal = round(sum(float(linea.subtotal_linea) for linea in lineas), 2)
        total_impuestos = round(sum(float(linea.impuesto_linea) for linea in lineas), 2)
        return subtotal, total_impuestos, round(subtotal + total_impuestos, 2)

    def crear_borrador(
        self, empresa_id: uuid.UUID, factura_id: uuid.UUID, data: CrearNotaDebitoRequest
    ) -> NotaDebito:
        factura = self._obtener_factura_aceptada(empresa_id, factura_id)
        lineas = self._construir_lineas(factura, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        nota = NotaDebito(
            empresa_id=empresa_id,
            factura_id=factura.id,
            cliente_id=factura.cliente_id,
            fecha=factura.fecha,
            motivo_codigo=data.motivo_codigo,
            estado="borrador",
            subtotal=subtotal,
            total_impuestos=total_impuestos,
            total=total,
            lineas=lineas,
        )
        self.db.add(nota)
        self.db.commit()
        self.db.refresh(nota)
        return self.obtener(empresa_id, nota.id)

    def actualizar_borrador(
        self, empresa_id: uuid.UUID, nota_id: uuid.UUID, data: ActualizarNotaDebitoRequest
    ) -> NotaDebito:
        nota = self._obtener_editable(empresa_id, nota_id)
        factura = self._obtener_factura_aceptada(empresa_id, nota.factura_id)
        lineas = self._construir_lineas(factura, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        if nota.estado == "rechazada":
            nota.estado = "borrador"
            nota.consecutivo = None
            nota.numero_completo = None
            nota.alegra_debit_note_id = None
            nota.cude = None
            nota.qr_code_content = None
            nota.firma_digital = None
            nota.razon_rechazo = None
            nota.notificaciones_dian = None
            nota.fecha_envio = None
            nota.fecha_respuesta = None

        nota.motivo_codigo = data.motivo_codigo
        nota.subtotal = subtotal
        nota.total_impuestos = total_impuestos
        nota.total = total
        nota.lineas = lineas

        self.db.add(nota)
        self.db.commit()
        self.db.refresh(nota)
        return self.obtener(empresa_id, nota.id)

    def eliminar_borrador(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> None:
        nota = self._obtener_editable(empresa_id, nota_id)
        nota.eliminado = datetime.now(timezone.utc)
        self.db.add(nota)
        self.db.commit()

    def _incrementar_consecutivo(self, empresa_id: uuid.UUID) -> int:
        """Mismo contador atomico que NotaCreditoService, tipo='debito'."""
        stmt = insert(ConsecutivoNota).values(empresa_id=empresa_id, tipo="debito", consecutivo_actual=1)
        stmt = stmt.on_conflict_do_update(
            index_elements=["empresa_id", "tipo"],
            set_={"consecutivo_actual": ConsecutivoNota.consecutivo_actual + 1},
        ).returning(ConsecutivoNota.consecutivo_actual)
        resultado = self.db.execute(stmt)
        consecutivo = resultado.scalar_one()
        self.db.commit()
        return consecutivo

    def enviar(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> NotaDebito:
        nota = self._obtener_editable(empresa_id, nota_id)
        factura = self._obtener_factura_aceptada(empresa_id, nota.factura_id)
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.id_alegra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta empresa aun no esta registrada en Alegra.")

        consecutivo = self._incrementar_consecutivo(empresa_id)
        payload = self._construir_payload_alegra(empresa, factura, nota, consecutivo)

        try:
            respuesta = self._alegra_client.create_debit_note(payload)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body))

        self._aplicar_respuesta_envio(nota, consecutivo, respuesta)

        self.db.add(nota)
        self.db.commit()
        self.db.refresh(nota)

        if nota.estado == "aceptada":
            try:
                revisar_alerta_cuota_por_empresa(self.db, empresa_id)
            except Exception as exc:  # noqa: BLE001 -- best-effort, no debe romper el envio.
                logger.error("No se pudo revisar la cuota de documentos de la empresa %s: %s", empresa_id, exc)

        return self.obtener(empresa_id, nota.id)

    @staticmethod
    def _aplicar_respuesta_envio(nota: NotaDebito, consecutivo: int, respuesta: dict) -> None:
        debit_note = respuesta.get("debitNote") or {}
        nota.consecutivo = consecutivo
        nota.numero_completo = f"{PREFIJO_NOTA_DEBITO}-{consecutivo:06d}"
        nota.alegra_debit_note_id = debit_note.get("id")
        nota.cude = debit_note.get("cude")
        nota.qr_code_content = debit_note.get("qrCodeContent")
        nota.fecha_envio = datetime.now(timezone.utc)
        nota.firma_digital = None

        government_response = debit_note.get("governmentResponse") or {}
        nota.notificaciones_dian = government_response.get("errorMessages") or None

        legal_status = debit_note.get("legalStatus")
        if legal_status in ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS"):
            nota.estado = "aceptada"
            nota.razon_rechazo = None
            nota.fecha_respuesta = datetime.now(timezone.utc)
        elif legal_status == "REJECTED":
            nota.estado = "rechazada"
            nota.razon_rechazo = map_government_response(
                government_response.get("code", ""), government_response.get("message") or "La DIAN rechazo la nota."
            )
            nota.fecha_respuesta = datetime.now(timezone.utc)
        else:
            nota.estado = "enviada"
            nota.razon_rechazo = None

    @staticmethod
    def _construir_payload_alegra(empresa: Empresa, factura: Factura, nota: NotaDebito, consecutivo: int) -> dict:
        prefijo_factura = factura.numero_completo[: -len(str(factura.consecutivo))]

        items = []
        taxable_total = 0.0
        for linea in nota.lineas:
            item = {
                "description": linea.descripcion,
                "price": float(linea.precio_unitario),
                "quantity": float(linea.cantidad),
                "unitCode": linea.unidad_medida,
                "subtotal": float(linea.subtotal_linea),
                "taxAmount": float(linea.impuesto_linea),
            }
            if linea.tributo and float(linea.tarifa_impuesto) > 0:
                item["taxes"] = [
                    {
                        "taxCode": linea.tributo,
                        "taxAmount": float(linea.impuesto_linea),
                        "taxPercentage": str(int(round(float(linea.tarifa_impuesto)))),
                        "taxableAmount": float(linea.subtotal_linea),
                    }
                ]
                taxable_total += float(linea.subtotal_linea)
            items.append(item)

        return {
            "number": consecutivo,
            "conceptCode": nota.motivo_codigo,
            "company": {"id": empresa.id_alegra},
            "customer": {
                "name": factura.cliente.nombre,
                "identificationType": factura.cliente.tipo_identificacion,
                "identificationNumber": factura.cliente.numero_identificacion,
                "email": factura.cliente.correo_electronico,
            },
            "associatedDocuments": [
                {
                    "date": factura.fecha.isoformat(),
                    "documentType": "01",
                    "number": factura.consecutivo,
                    "prefix": prefijo_factura,
                    "uuid": factura.cufe,
                }
            ],
            "invoicePeriod": {"startDate": factura.fecha.isoformat(), "endDate": factura.fecha.isoformat()},
            "items": items,
            "totalAmounts": {
                "grossTotal": float(nota.subtotal),
                "taxableTotal": round(taxable_total, 2),
                "taxTotal": float(nota.total_impuestos),
                "discountTotal": 0,
                "chargeTotal": 0,
                "advanceTotal": 0,
                "payableTotal": float(nota.total),
                "currencyCode": "COP",
            },
            "payments": [
                _construir_pago(
                    factura.forma_pago or "1", factura.metodo_pago or "10", float(nota.total), factura.fecha_vencimiento
                )
            ],
        }
