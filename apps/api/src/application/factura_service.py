import uuid
import xml.etree.ElementTree as ET
from datetime import date as date_cls
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.application.resolucion_dian_service import ResolucionDianService
from src.core.alegra_client import AlegraApiError, AlegraClient
from src.core.alegra_errors import map_alegra_error, map_government_response
from src.domain.factura import ActualizarFacturaRequest, CrearFacturaRequest, LineaFacturaRequest
from src.infrastructure.db.models import Cliente, Empresa, Factura, FacturaLinea, Producto


def _tarifa_a_string(tarifa: float) -> str:
    """taxPercentage de Alegra va como string (hallazgo Sprint 0). Si la
    tarifa no coincide con un valor DIAN valido, se envia igual -- Alegra la
    rechaza y el error se mapea, no se bloquea aqui para no duplicar la
    validacion que ya vive en el catalogo de Impuestos (Sprint 7)."""
    entero = int(round(tarifa))
    return str(entero) if float(entero) == tarifa else str(tarifa)


def _extraer_firma_digital(xml_bytes: bytes) -> str | None:
    """Busca <ds:SignatureValue> en el XML firmado por namespace-agnostic
    local-name (el prefijo puede variar) -- verificado contra un XML real de
    Alegra en sandbox."""
    root = ET.fromstring(xml_bytes)
    for elem in root.iter():
        local_name = elem.tag.rsplit("}", 1)[-1]
        if local_name == "SignatureValue" and elem.text:
            return elem.text.strip()
    return None


class FacturaService:
    """CRUD de Facturas + envio a Alegra. Scoping por empresa_id siempre sale
    del JWT (tenant.empresa_id), nunca de un campo que mande el cliente."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(
        self, empresa_id: uuid.UUID, estado: str | None = None, cliente_id: uuid.UUID | None = None
    ) -> list[Factura]:
        query = (
            select(Factura)
            .where(Factura.empresa_id == empresa_id, Factura.eliminado.is_(None))
            .options(selectinload(Factura.cliente))
            .order_by(Factura.creado.desc())
        )
        if estado:
            query = query.where(Factura.estado == estado)
        if cliente_id:
            query = query.where(Factura.cliente_id == cliente_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> Factura:
        factura = self.db.execute(
            select(Factura)
            .where(Factura.id == factura_id, Factura.empresa_id == empresa_id, Factura.eliminado.is_(None))
            .options(selectinload(Factura.cliente), selectinload(Factura.lineas))
        ).scalar_one_or_none()
        if factura is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura no encontrada.")
        return factura

    def obtener_url_xml(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> str:
        """La URL de S3 es temporal (expira en 1h, ver docs/alegra-investigacion.md)
        -- nunca se persiste, se vuelve a pedir a Alegra cada vez."""
        factura = self.obtener(empresa_id, factura_id)
        if not factura.alegra_invoice_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta factura todavia no fue enviada a Alegra.")

        try:
            respuesta = self._alegra_client.get_invoice(factura.alegra_invoice_id)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body))

        url = (respuesta.get("files") or {}).get("xml")
        if not url:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Alegra no tiene un XML disponible para esta factura.")
        return url

    def obtener_firma_digital(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> str:
        """La firma (ds:SignatureValue) es inmutable una vez emitido el
        documento -- a diferencia de la URL del XML (temporal), se cachea en
        la factura la primera vez que se pide para no volver a descargar y
        parsear el XML en cada visita a la representacion grafica."""
        factura = self.obtener(empresa_id, factura_id)
        if factura.firma_digital:
            return factura.firma_digital

        url = self.obtener_url_xml(empresa_id, factura_id)
        try:
            xml_bytes = self._alegra_client.fetch_raw(url)
            firma = _extraer_firma_digital(xml_bytes)
        except (httpx.HTTPError, ET.ParseError) as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No se pudo obtener la firma digital del XML.") from exc

        if not firma:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "El XML no contiene una firma digital.")

        factura.firma_digital = firma
        self.db.add(factura)
        self.db.commit()
        return firma

    def _obtener_editable(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> Factura:
        """Editable/reenviable en 'borrador' y tambien en 'rechazada' -- una
        factura rechazada por la DIAN no es un estado terminal: el usuario
        debe poder corregir cliente/lineas y volver a enviar (con un
        consecutivo nuevo, ver enviar()). 'enviada'/'aceptada' si son
        terminales -- una vez aceptada no se puede editar (Notas
        Credito/Debito, Sprint 9)."""
        factura = self.obtener(empresa_id, factura_id)
        if factura.estado not in ("borrador", "rechazada"):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Solo se puede editar una factura en estado borrador o rechazada."
            )
        return factura

    def _validar_cliente(self, empresa_id: uuid.UUID, cliente_id: uuid.UUID) -> Cliente:
        cliente = self.db.execute(
            select(Cliente).where(
                Cliente.id == cliente_id, Cliente.empresa_id == empresa_id, Cliente.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if cliente is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado.")
        return cliente

    def _construir_lineas(
        self, empresa_id: uuid.UUID, lineas_data: list[LineaFacturaRequest]
    ) -> list[FacturaLinea]:
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
            precio_unitario = float(producto.precio)
            tarifa = float(producto.tarifa_impuesto)
            subtotal_linea = round(cantidad * precio_unitario, 2)
            impuesto_linea = round(subtotal_linea * tarifa / 100, 2)

            lineas.append(
                FacturaLinea(
                    producto_id=producto.id,
                    codigo=producto.codigo,
                    descripcion=producto.nombre,
                    unidad_medida=producto.unidad_medida,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    tributo=producto.tributo,
                    tarifa_impuesto=tarifa,
                    subtotal_linea=subtotal_linea,
                    impuesto_linea=impuesto_linea,
                    total_linea=subtotal_linea + impuesto_linea,
                )
            )
        return lineas

    @staticmethod
    def _totales(lineas: list[FacturaLinea]) -> tuple[float, float, float]:
        subtotal = round(sum(float(linea.subtotal_linea) for linea in lineas), 2)
        total_impuestos = round(sum(float(linea.impuesto_linea) for linea in lineas), 2)
        return subtotal, total_impuestos, round(subtotal + total_impuestos, 2)

    def crear_borrador(self, empresa_id: uuid.UUID, data: CrearFacturaRequest) -> Factura:
        self._validar_cliente(empresa_id, data.cliente_id)
        lineas = self._construir_lineas(empresa_id, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        factura = Factura(
            empresa_id=empresa_id,
            cliente_id=data.cliente_id,
            fecha=data.fecha,
            estado="borrador",
            subtotal=subtotal,
            total_impuestos=total_impuestos,
            total=total,
            lineas=lineas,
        )
        self.db.add(factura)
        self.db.commit()
        self.db.refresh(factura)
        return self.obtener(empresa_id, factura.id)

    def actualizar_borrador(
        self, empresa_id: uuid.UUID, factura_id: uuid.UUID, data: ActualizarFacturaRequest
    ) -> Factura:
        factura = self._obtener_editable(empresa_id, factura_id)
        self._validar_cliente(empresa_id, data.cliente_id)
        lineas = self._construir_lineas(empresa_id, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        if factura.estado == "rechazada":
            # Corregir una factura rechazada la vuelve a dejar como borrador
            # -- el intento anterior (consecutivo/CUFE/razon de rechazo) ya
            # no aplica, un reenvio pedira un consecutivo nuevo (ver
            # enviar()). No se puede reutilizar el numero rechazado ante la
            # DIAN, asi que no tiene sentido conservar esos datos.
            factura.estado = "borrador"
            factura.consecutivo = None
            factura.numero_completo = None
            factura.alegra_invoice_id = None
            factura.cufe = None
            factura.qr_code_content = None
            factura.firma_digital = None
            factura.razon_rechazo = None
            factura.notificaciones_dian = None
            factura.fecha_envio = None
            factura.fecha_respuesta = None

        factura.cliente_id = data.cliente_id
        factura.fecha = data.fecha
        factura.subtotal = subtotal
        factura.total_impuestos = total_impuestos
        factura.total = total
        factura.lineas = lineas

        self.db.add(factura)
        self.db.commit()
        self.db.refresh(factura)
        return self.obtener(empresa_id, factura.id)

    def eliminar_borrador(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> None:
        factura = self._obtener_editable(empresa_id, factura_id)
        factura.eliminado = datetime.now(timezone.utc)
        self.db.add(factura)
        self.db.commit()

    def enviar(self, empresa_id: uuid.UUID, factura_id: uuid.UUID, forma_pago: str, metodo_pago: str) -> Factura:
        factura = self._obtener_editable(empresa_id, factura_id)
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.id_alegra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta empresa aun no esta registrada en Alegra.")

        resolucion_service = ResolucionDianService(self.db, self._alegra_client)
        resolucion = resolucion_service.obtener_o_404(empresa_id)
        if resolucion.fecha_fin < date_cls.today():
            raise HTTPException(status.HTTP_409_CONFLICT, "La Resolucion DIAN configurada ya esta vencida.")

        consecutivo = resolucion_service.incrementar_consecutivo(empresa_id)
        payload = self._construir_payload_alegra(empresa, resolucion, factura, consecutivo, forma_pago, metodo_pago)

        try:
            respuesta = self._alegra_client.create_invoice(payload)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body))

        self._aplicar_respuesta_envio(factura, resolucion, consecutivo, forma_pago, metodo_pago, respuesta)

        self.db.add(factura)
        self.db.commit()
        self.db.refresh(factura)
        return self.obtener(empresa_id, factura.id)

    @staticmethod
    def _aplicar_respuesta_envio(
        factura: Factura,
        resolucion,
        consecutivo: int,
        forma_pago: str,
        metodo_pago: str,
        respuesta: dict,
    ) -> None:
        invoice = respuesta.get("invoice") or {}
        factura.consecutivo = consecutivo
        factura.numero_completo = invoice.get("fullNumber") or f"{resolucion.prefijo}{consecutivo}"
        factura.forma_pago = forma_pago
        factura.metodo_pago = metodo_pago
        factura.alegra_invoice_id = invoice.get("id")
        factura.cufe = invoice.get("cufe")
        factura.qr_code_content = invoice.get("qrCodeContent")
        factura.fecha_envio = datetime.now(timezone.utc)
        # Cada envio es un documento nuevo ante Alegra/la DIAN (invoice.id
        # nuevo) -- la firma cacheada de un intento anterior (rechazado o no)
        # ya no corresponde a este documento.
        factura.firma_digital = None

        government_response = invoice.get("governmentResponse") or {}
        # errorMessages trae el detalle completo (notificaciones no
        # bloqueantes en ACCEPTED_WITH_OBSERVATIONS, o las reglas violadas en
        # REJECTED) -- se guarda crudo, no solo el mensaje unico ya mapeado.
        factura.notificaciones_dian = government_response.get("errorMessages") or None

        legal_status = invoice.get("legalStatus")
        if legal_status in ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS"):
            # ACCEPTED_WITH_OBSERVATIONS = la DIAN acepto el documento con
            # notificaciones no bloqueantes (ej. reglas FAZ09/FAJ43b) -- es
            # una aceptacion real, no un estado intermedio ni un rechazo.
            factura.estado = "aceptada"
            # Limpia el rechazo de un intento anterior si este reenvio si
            # fue aceptado.
            factura.razon_rechazo = None
            factura.fecha_respuesta = datetime.now(timezone.utc)
        elif legal_status == "REJECTED":
            factura.estado = "rechazada"
            factura.razon_rechazo = map_government_response(
                government_response.get("code", ""),
                government_response.get("message") or "La DIAN rechazo la factura.",
            )
            factura.fecha_respuesta = datetime.now(timezone.utc)
        else:
            factura.estado = "enviada"
            factura.razon_rechazo = None

    @staticmethod
    def _construir_payload_alegra(
        empresa: Empresa, resolucion, factura: Factura, consecutivo: int, forma_pago: str, metodo_pago: str
    ) -> dict:
        items = []
        for linea in factura.lineas:
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
                        "taxPercentage": _tarifa_a_string(float(linea.tarifa_impuesto)),
                        "taxableAmount": float(linea.subtotal_linea),
                    }
                ]
            items.append(item)

        return {
            "documentType": "01",
            "number": consecutivo,
            "prefix": resolucion.prefijo,
            "company": {"id": empresa.id_alegra},
            "resolution": {
                "resolutionNumber": resolucion.numero_resolucion,
                "prefix": resolucion.prefijo,
                "minNumber": resolucion.rango_minimo,
                "maxNumber": resolucion.rango_maximo,
                "startDate": resolucion.fecha_inicio.isoformat(),
                "endDate": resolucion.fecha_fin.isoformat(),
                "technicalKey": resolucion.technical_key,
            },
            "customer": {
                "name": factura.cliente.nombre,
                "identificationType": factura.cliente.tipo_identificacion,
                "identificationNumber": factura.cliente.numero_identificacion,
                "email": factura.cliente.correo_electronico,
            },
            "items": items,
            "totalAmounts": {
                "grossTotal": float(factura.subtotal),
                "taxableTotal": float(factura.subtotal),
                "taxTotal": float(factura.total_impuestos),
                "discountTotal": 0,
                "chargeTotal": 0,
                "advanceTotal": 0,
                "payableTotal": float(factura.total),
                "currencyCode": "COP",
            },
            "payments": [{"paymentForm": forma_pago, "paymentMethod": metodo_pago, "amount": float(factura.total)}],
        }
