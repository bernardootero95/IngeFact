import logging
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.resolucion_documento_soporte_service import ResolucionDocumentoSoporteService
from src.application.suscripcion_service import revisar_alerta_cuota_sin_romper, verificar_cupo_disponible
from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error, map_government_response
from src.core.documento_soporte_pdf import generar_representacion_pdf_documento_soporte
from src.core.tiempo import fecha_documento_colombia
from src.application.correo_documento import (
    construir_adjuntos,
    ejecutar_envio_reportando_errores,
    resolver_destinatario,
)
from src.core.email_client import EmailClient
from src.core.email_templates import plantilla_documento_soporte_proveedor
from src.core.representacion_pdf_common import formatear_cop
from src.core.xml_utils import extraer_firma_digital
from src.domain.documento_soporte import CrearDocumentoSoporteRequest, LineaDocumentoSoporteRequest
from src.infrastructure.db.models import (
    DocumentoSoporte,
    DocumentoSoporteLinea,
    Empresa,
    Producto,
    Proveedor,
)

logger = logging.getLogger(__name__)

# Confirmado contra el schema OpenAPI crudo de Alegra (Fase 3, ver
# docs/alegra-investigacion.md): supplier.identificationType excluye cedula
# (13) de forma permanente -- un Documento Soporte solo se puede emitir para
# un proveedor identificado con uno de estos tipos (en la practica, NIT "31"
# incluso para persona natural, via NIT personal ante la DIAN).
SUPPLIER_IDENTIFICATION_TYPES_VALIDOS = ("21", "22", "31", "41", "42", "47", "50")


def validar_proveedor_para_documento_soporte(proveedor: Proveedor) -> None:
    """Verifica que el proveedor cumpla los 3 requisitos DIAN para un
    Documento Soporte (NIT valido, tipo de organizacion, direccion). Lanza
    HTTPException 409 con el mensaje puntual si algo falta."""
    if proveedor.tipo_identificacion not in SUPPLIER_IDENTIFICATION_TYPES_VALIDOS:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"El proveedor '{proveedor.nombre}' tiene tipo de identificacion "
            f"'{proveedor.tipo_identificacion}', pero la DIAN exige NIT (u otro documento valido: "
            f"{', '.join(SUPPLIER_IDENTIFICATION_TYPES_VALIDOS)}) para un Documento Soporte -- "
            "no acepta cedula de ciudadania. Actualiza el proveedor con su NIT.",
        )
    if not proveedor.tipo_organizacion:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"El proveedor '{proveedor.nombre}' no tiene tipo de organizacion configurado "
            "(persona natural o juridica) -- completa ese dato antes de enviar.",
        )
    if not proveedor.direccion:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"El proveedor '{proveedor.nombre}' no tiene direccion configurada -- "
            "la DIAN la exige para un Documento Soporte.",
        )


def _construir_company_alegra(empresa: Empresa) -> dict:
    return {
        "id": empresa.id_alegra,
        "organizationType": int(empresa.tipo_organizacion) if empresa.tipo_organizacion else 1,
        "identificationType": empresa.tipo_identificacion,
        "identificationNumber": empresa.numero_identificacion,
        "dv": empresa.digito_verificacion,
        "name": empresa.razon_social,
        "regimeCode": empresa.regimen or "R-99-PN",
        # Confirmado en vivo: {"id": "01"} (IVA) o {"id": "ZZ"} (no aplica,
        # default) -- no el string plano que usan items[].taxes[].taxCode.
        "taxCode": {"id": "01" if empresa.regimen_fiscal == "48" else "ZZ"},
    }


def _construir_supplier_alegra(proveedor: Proveedor) -> dict:
    supplier = {
        "name": proveedor.nombre,
        # "10" = residente fiscal en Colombia -- unico caso soportado hoy
        # (Fase 3 no cubre proveedores extranjeros, "11" = no residente).
        "origin": "10",
        "organizationType": int(proveedor.tipo_organizacion),
        "identificationType": proveedor.tipo_identificacion,
        "identificationNumber": proveedor.numero_identificacion,
        "regimeCode": proveedor.regimen or "R-99-PN",
        "address": {
            "address": proveedor.direccion,
            "city": proveedor.municipio or "11001",
            "department": proveedor.departamento or "11",
            "country": "CO",
        },
    }
    if proveedor.digito_verificacion:
        supplier["dv"] = proveedor.digito_verificacion
    return supplier


class DocumentoSoporteService:
    """Documento Soporte de Adquisiciones -- envia a Alegra/DIAN mismo patron que
    FacturaService pero con su propia resolucion de numeracion
    (ResolucionDocumentoSoporteService). Consume cupo del plan igual que una
    Factura (ver contar_documentos_usados, decision de negocio 2026-09-24)."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(
        self, empresa_id: uuid.UUID, estado: str | None = None, proveedor_id: uuid.UUID | None = None
    ) -> list[DocumentoSoporte]:
        query = (
            select(DocumentoSoporte)
            .where(DocumentoSoporte.empresa_id == empresa_id, DocumentoSoporte.eliminado.is_(None))
            .options(selectinload(DocumentoSoporte.proveedor))
            .order_by(DocumentoSoporte.creado.desc())
        )
        if estado:
            query = query.where(DocumentoSoporte.estado == estado)
        if proveedor_id:
            query = query.where(DocumentoSoporte.proveedor_id == proveedor_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, documento_id: uuid.UUID) -> DocumentoSoporte:
        documento = self.db.execute(
            select(DocumentoSoporte)
            .where(
                DocumentoSoporte.id == documento_id,
                DocumentoSoporte.empresa_id == empresa_id,
                DocumentoSoporte.eliminado.is_(None),
            )
            .options(selectinload(DocumentoSoporte.proveedor), selectinload(DocumentoSoporte.lineas))
        ).scalar_one_or_none()
        if documento is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento Soporte no encontrado.")
        return documento

    def _obtener_editable(self, empresa_id: uuid.UUID, documento_id: uuid.UUID) -> DocumentoSoporte:
        documento = self.obtener(empresa_id, documento_id)
        if documento.estado not in ("borrador", "rechazado"):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Solo se puede editar un documento soporte en estado borrador o rechazado."
            )
        return documento

    def _validar_proveedor(self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID) -> Proveedor:
        proveedor = self.db.execute(
            select(Proveedor).where(
                Proveedor.id == proveedor_id, Proveedor.empresa_id == empresa_id, Proveedor.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if proveedor is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado.")
        return proveedor

    def _construir_lineas(
        self, empresa_id: uuid.UUID, lineas_data: list[LineaDocumentoSoporteRequest]
    ) -> list[DocumentoSoporteLinea]:
        lineas = []
        for linea_data in lineas_data:
            producto = self.db.execute(
                select(Producto).where(
                    Producto.id == linea_data.producto_id,
                    Producto.empresa_id == empresa_id,
                    Producto.eliminado.is_(None),
                )
            ).scalar_one_or_none()
            if producto is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"Producto {linea_data.producto_id} no encontrado.")

            cantidad = linea_data.cantidad
            precio_unitario = (
                float(linea_data.precio_unitario) if linea_data.precio_unitario is not None else float(producto.precio)
            )
            subtotal_linea = round(cantidad * precio_unitario, 2)

            lineas.append(
                DocumentoSoporteLinea(
                    producto_id=producto.id,
                    codigo=producto.codigo,
                    descripcion=producto.descripcion or producto.nombre,
                    unidad_medida=producto.unidad_medida,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    # El Documento Soporte se le hace a quien NO factura, asi
                    # que no lleva impuestos aunque el producto tenga IVA en
                    # el catalogo: se ignoran tributo y tarifa del producto.
                    tributo=None,
                    tarifa_impuesto=0,
                    subtotal_linea=subtotal_linea,
                    impuesto_linea=0,
                    total_linea=subtotal_linea,
                )
            )
        return lineas

    @staticmethod
    def _totales(lineas: list[DocumentoSoporteLinea]) -> tuple[float, float, float]:
        subtotal = round(sum(float(linea.subtotal_linea) for linea in lineas), 2)
        total_impuestos = round(sum(float(linea.impuesto_linea) for linea in lineas), 2)
        return subtotal, total_impuestos, round(subtotal + total_impuestos, 2)

    def crear_borrador(self, empresa_id: uuid.UUID, data: CrearDocumentoSoporteRequest) -> DocumentoSoporte:
        self._validar_proveedor(empresa_id, data.proveedor_id)
        lineas = self._construir_lineas(empresa_id, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        documento = DocumentoSoporte(
            empresa_id=empresa_id,
            proveedor_id=data.proveedor_id,
            fecha=data.fecha,
            estado="borrador",
            subtotal=subtotal,
            total_impuestos=total_impuestos,
            total=total,
            lineas=lineas,
        )
        self.db.add(documento)
        self.db.commit()
        self.db.refresh(documento)
        return self.obtener(empresa_id, documento.id)

    def actualizar_borrador(
        self, empresa_id: uuid.UUID, documento_id: uuid.UUID, data: CrearDocumentoSoporteRequest
    ) -> DocumentoSoporte:
        documento = self._obtener_editable(empresa_id, documento_id)
        self._validar_proveedor(empresa_id, data.proveedor_id)
        lineas = self._construir_lineas(empresa_id, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        if documento.estado == "rechazado":
            # Corregir un documento rechazado lo vuelve a dejar como borrador.
            # consecutivo/numero_completo NO se limpian -- mismo criterio que
            # FacturaService.actualizar_borrador: se reenvia con el MISMO numero.
            # El resto si son datos del intento anterior y se limpian.
            documento.estado = "borrador"
            documento.alegra_support_document_id = None
            documento.cuds = None
            documento.qr_code_content = None
            documento.firma_digital = None
            documento.razon_rechazo = None
            documento.notificaciones_dian = None
            documento.fecha_envio = None
            documento.fecha_respuesta = None

        documento.proveedor_id = data.proveedor_id
        documento.fecha = data.fecha
        documento.subtotal = subtotal
        documento.total_impuestos = total_impuestos
        documento.total = total
        documento.lineas = lineas

        self.db.add(documento)
        self.db.commit()
        self.db.refresh(documento)
        return self.obtener(empresa_id, documento.id)

    def eliminar_borrador(self, empresa_id: uuid.UUID, documento_id: uuid.UUID) -> None:
        documento = self._obtener_editable(empresa_id, documento_id)
        documento.eliminado = datetime.now(timezone.utc)
        self.db.add(documento)
        self.db.commit()

    def enviar(self, empresa_id: uuid.UUID, documento_id: uuid.UUID, forma_pago: str, metodo_pago: str) -> DocumentoSoporte:
        documento = self._obtener_editable(empresa_id, documento_id)
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.id_alegra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta empresa aun no esta registrada en Alegra.")

        validar_proveedor_para_documento_soporte(documento.proveedor)
        verificar_cupo_disponible(self.db, empresa_id)

        resolucion_service = ResolucionDocumentoSoporteService(self.db)
        resolucion = resolucion_service.obtener_o_404(empresa_id)

        # Reenvio de un documento rechazado: reutiliza el numero ya asignado (ver
        # actualizar_borrador) en vez de pedir uno nuevo.
        es_reenvio = documento.consecutivo is not None
        consecutivo = documento.consecutivo if es_reenvio else resolucion_service.incrementar_consecutivo(empresa_id)
        payload = self._construir_payload_alegra(empresa, resolucion, documento, consecutivo, forma_pago, metodo_pago)

        try:
            respuesta = self._alegra_client.create_support_document(payload)
        except AlegraApiError as exc:
            # 4xx: Alegra no creo nada. Si el numero se pidio en este intento (no
            # es un reenvio, que ya lo traia) se devuelve (ver application/consecutivo.py).
            if not es_reenvio:
                resolucion_service.revertir_consecutivo(empresa_id, consecutivo)
            raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc
        except AlegraTransientError as exc:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Alegra no esta respondiendo en este momento. Intenta de nuevo en unos minutos.",
            ) from exc

        self._aplicar_respuesta_envio(documento, resolucion, consecutivo, forma_pago, metodo_pago, respuesta)

        self.db.add(documento)
        self.db.commit()
        self.db.refresh(documento)

        documento_actualizado = self.obtener(empresa_id, documento.id)
        notificar_documento_soporte_aceptado(self.db, documento_actualizado, self._alegra_client)
        if documento_actualizado.estado == "aceptado":
            revisar_alerta_cuota_sin_romper(self.db, empresa_id)
        return documento_actualizado

    def obtener_url_xml(self, empresa_id: uuid.UUID, documento_id: uuid.UUID) -> str:
        """URL S3 firmada (temporal) del XML -- se pide fresca a Alegra en
        cada llamada, nunca se persiste."""
        documento = self.obtener(empresa_id, documento_id)
        if not documento.alegra_support_document_id:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Este documento soporte todavia no fue enviado a Alegra."
            )
        try:
            respuesta = self._alegra_client.get_support_document(documento.alegra_support_document_id)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body)) from exc
        url = (respuesta.get("files") or {}).get("xml")
        if not url:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Alegra no tiene un XML disponible para este documento.")
        return url

    def obtener_firma_digital(self, empresa_id: uuid.UUID, documento_id: uuid.UUID) -> str:
        documento = self.obtener(empresa_id, documento_id)
        if documento.firma_digital:
            return documento.firma_digital

        url = self.obtener_url_xml(empresa_id, documento_id)
        try:
            xml_bytes = self._alegra_client.fetch_raw(url)
            firma = extraer_firma_digital(xml_bytes)
        except (httpx.HTTPError, ET.ParseError) as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No se pudo obtener la firma digital del XML.") from exc

        if not firma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "El XML no contiene una firma digital.")

        documento.firma_digital = firma
        self.db.add(documento)
        self.db.commit()
        return firma

    def generar_pdf_representacion(self, empresa_id: uuid.UUID, documento_id: uuid.UUID) -> bytes:
        """PDF real de la representacion grafica -- solo tiene sentido para un
        documento ya aceptado (CUDS/QR/firma reales)."""
        documento = self.obtener(empresa_id, documento_id)
        if documento.estado != "aceptado":
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Solo se puede generar el PDF de un documento soporte ya aceptado por la DIAN."
            )
        firma_digital = self.obtener_firma_digital(empresa_id, documento_id)
        return generar_representacion_pdf_documento_soporte(self.db, documento, firma_digital)

    def enviar_por_correo(
        self, empresa_id: uuid.UUID, documento_id: uuid.UUID, destinatario: str | None = None
    ) -> None:
        """Reenvio manual al proveedor (boton "Reenviar por correo" en el
        detalle) -- a diferencia del envio automatico de
        notificar_documento_soporte_aceptado, aqui un problema real
        (documento sin aceptar, sin correo, fallo de Resend/Alegra) debe
        reportarse al usuario en vez de fallar en silencio. `destinatario` es
        el correo que pidio el usuario; sin el, va al del proveedor."""
        documento = self.obtener(empresa_id, documento_id)
        if documento.estado != "aceptado":
            raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede enviar por correo un documento soporte aceptado.")
        correo = resolver_destinatario(
            destinatario,
            documento.proveedor.correo_electronico if documento.proveedor else None,
            "El proveedor de este documento",
        )
        ejecutar_envio_reportando_errores(
            lambda: _enviar_correo_documento_soporte(
                self.db, documento, self._alegra_client, EmailClient(), correo
            ),
            "No se pudo preparar el correo del documento soporte.",
        )

    @staticmethod
    def _aplicar_respuesta_envio(
        documento: DocumentoSoporte,
        resolucion,
        consecutivo: int,
        forma_pago: str,
        metodo_pago: str,
        respuesta: dict,
    ) -> None:
        support_document = respuesta.get("supportDocument") or {}
        documento.consecutivo = consecutivo
        documento.numero_completo = support_document.get("fullNumber") or f"{resolucion.prefijo}{consecutivo}"
        documento.forma_pago = forma_pago
        documento.metodo_pago = metodo_pago
        documento.alegra_support_document_id = support_document.get("id")
        documento.cuds = support_document.get("cuds")
        documento.qr_code_content = support_document.get("qrCodeContent")
        documento.fecha_envio = datetime.now(timezone.utc)

        government_response = support_document.get("governmentResponse") or {}
        documento.notificaciones_dian = government_response.get("errorMessages") or None

        legal_status = support_document.get("legalStatus")
        if legal_status in ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS"):
            documento.estado = "aceptado"
            documento.razon_rechazo = None
            documento.fecha_respuesta = datetime.now(timezone.utc)
        elif legal_status == "REJECTED":
            documento.estado = "rechazado"
            documento.razon_rechazo = map_government_response(
                government_response.get("code", ""),
                government_response.get("message") or "La DIAN rechazo el documento soporte.",
            )
            documento.fecha_respuesta = datetime.now(timezone.utc)
        else:
            documento.estado = "enviado"
            documento.razon_rechazo = None

    @staticmethod
    def _construir_payload_alegra(
        empresa: Empresa,
        resolucion,
        documento: DocumentoSoporte,
        consecutivo: int,
        forma_pago: str,
        metodo_pago: str,
    ) -> dict:
        items = [
            {
                # "999" = estandar de adopcion del contribuyente (enum real
                # confirmado: 001|010|020|999) -- IngeFact no tiene catalogo
                # de codigos UNSPSC/GTIN por producto, se usa el generico.
                "standardCode": {"identificationId": linea.codigo or str(linea.producto_id), "id": "999"},
                "description": linea.descripcion,
                "price": float(linea.precio_unitario),
                "quantity": float(linea.cantidad),
                "unitCode": linea.unidad_medida,
                "subtotal": float(linea.subtotal_linea),
                # Sin impuestos: ver _construir_lineas.
                "taxAmount": 0,
            }
            for linea in documento.lineas
        ]

        return {
            "number": consecutivo,
            "resolution": {
                "resolutionNumber": resolucion.numero_resolucion,
                "prefix": resolucion.prefijo,
                "minNumber": resolucion.rango_minimo,
                "maxNumber": resolucion.rango_maximo,
                "startDate": resolucion.fecha_inicio.isoformat(),
                "endDate": resolucion.fecha_fin.isoformat(),
            },
            "company": _construir_company_alegra(empresa),
            "supplier": _construir_supplier_alegra(documento.proveedor),
            "items": items,
            "payments": [{"paymentForm": forma_pago, "paymentMethod": metodo_pago}],
            "totalAmounts": {
                "grossTotal": float(documento.subtotal),
                "taxableTotal": 0,
                "taxTotal": 0,
                "discountTotal": 0,
                "chargeTotal": 0,
                "advanceTotal": 0,
                "payableTotal": float(documento.total),
                "currencyCode": "COP",
            },
        }


def _enviar_correo_documento_soporte(
    db: Session,
    documento: DocumentoSoporte,
    alegra_client: AlegraClient | None,
    email_client: EmailClient,
    destinatario: str,
) -> None:
    """Arma y envia el correo con QR + PDF + XML -- deja propagar cualquier
    error para que cada llamador decida si es best-effort o debe reportarse.
    Asume que el documento esta aceptado y que `destinatario` ya esta
    resuelto -- eso lo valida el llamador."""
    servicio = DocumentoSoporteService(db, alegra_client)
    url_xml = servicio.obtener_url_xml(documento.empresa_id, documento.id)
    xml_bytes = servicio._alegra_client.fetch_raw(url_xml)
    firma_digital = servicio.obtener_firma_digital(documento.empresa_id, documento.id)
    pdf_bytes = generar_representacion_pdf_documento_soporte(db, documento, firma_digital)

    empresa = db.get(Empresa, documento.empresa_id)
    fecha_mostrar = fecha_documento_colombia(documento.fecha_envio, documento.fecha)
    subject, html = plantilla_documento_soporte_proveedor(
        razon_social_adquiriente=empresa.razon_social,
        nombre_proveedor=documento.proveedor.nombre,
        numero_completo=documento.numero_completo or "",
        fecha=fecha_mostrar.strftime("%d/%m/%Y"),
        total_formateado=formatear_cop(float(documento.total)),
        cuds=documento.cuds or "",
    )
    numero = documento.numero_completo or str(documento.id)
    attachments = construir_adjuntos(numero, documento.qr_code_content, pdf_bytes, xml_bytes)
    email_client.send(to=destinatario, subject=subject, html=html, attachments=attachments)


def notificar_documento_soporte_aceptado(
    db: Session,
    documento: DocumentoSoporte,
    alegra_client: AlegraClient | None = None,
    email_client: EmailClient | None = None,
) -> None:
    """Envia al proveedor el QR + PDF + XML del documento soporte ya aceptado,
    best-effort: nunca debe romper el flujo que la llama (el documento ya
    quedo aceptado ante la DIAN). Para el reenvio manual, que si debe
    reportar un fallo real, ver DocumentoSoporteService.enviar_por_correo."""
    if documento.estado != "aceptado":
        return
    if not documento.proveedor or not documento.proveedor.correo_electronico:
        return

    try:
        _enviar_correo_documento_soporte(
            db, documento, alegra_client, email_client or EmailClient(), documento.proveedor.correo_electronico
        )
    except Exception as exc:  # noqa: BLE001 -- best-effort, ver docstring.
        logger.error("No se pudo notificar el documento soporte %s por correo: %s", documento.id, exc)
