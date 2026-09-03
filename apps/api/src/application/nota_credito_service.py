import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from src.core.alegra_client import AlegraApiError, AlegraClient
from src.core.alegra_errors import map_alegra_error, map_government_response
from src.domain.nota_credito import ActualizarNotaCreditoRequest, CrearNotaCreditoRequest, LineaNotaCreditoRequest
from src.infrastructure.db.models import ConsecutivoNota, Empresa, Factura, NotaCredito, NotaCreditoLinea

# Motivo "Anulacion del documento equivalente electronico" del catalogo DIAN
# conceptos_nota_credito -- usado por el atajo "Anular Factura".
MOTIVO_ANULACION = "2"

PREFIJO_NOTA_CREDITO = "NC"


class NotaCreditoService:
    """CRUD de Notas Credito + envio a Alegra. Scoping por empresa_id
    siempre sale del JWT (tenant.empresa_id), nunca de un campo que mande
    el cliente -- mismo criterio que FacturaService."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(
        self, empresa_id: uuid.UUID, estado: str | None = None, factura_id: uuid.UUID | None = None
    ) -> list[NotaCredito]:
        query = (
            select(NotaCredito)
            .where(NotaCredito.empresa_id == empresa_id, NotaCredito.eliminado.is_(None))
            .options(selectinload(NotaCredito.cliente), selectinload(NotaCredito.factura))
            .order_by(NotaCredito.creado.desc())
        )
        if estado:
            query = query.where(NotaCredito.estado == estado)
        if factura_id:
            query = query.where(NotaCredito.factura_id == factura_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> NotaCredito:
        nota = self.db.execute(
            select(NotaCredito)
            .where(NotaCredito.id == nota_id, NotaCredito.empresa_id == empresa_id, NotaCredito.eliminado.is_(None))
            .options(
                selectinload(NotaCredito.cliente), selectinload(NotaCredito.factura), selectinload(NotaCredito.lineas)
            )
        ).scalar_one_or_none()
        if nota is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Nota credito no encontrada.")
        return nota

    def obtener_url_xml(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> str:
        nota = self.obtener(empresa_id, nota_id)
        if not nota.alegra_credit_note_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta nota credito todavia no fue enviada a Alegra.")
        try:
            respuesta = self._alegra_client.get_credit_note(nota.alegra_credit_note_id)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body))
        url = (respuesta.get("files") or {}).get("xml")
        if not url:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Alegra no tiene un XML disponible para esta nota.")
        return url

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
                status.HTTP_409_CONFLICT, "Solo se pueden crear notas credito sobre facturas aceptadas por la DIAN."
            )
        return factura

    def disponibilidad_lineas_por_factura(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> dict[uuid.UUID, float]:
        """Punto de entrada publico para consultar disponibilidad sin pasar
        por el resto del flujo de creacion -- usado por la ruta que alimenta
        el formulario de Nueva Nota Credito."""
        factura = self._obtener_factura_aceptada(empresa_id, factura_id)
        return self.disponibilidad_lineas(factura)

    def disponibilidad_lineas(self, factura: Factura) -> dict[uuid.UUID, float]:
        """Cuanto de cada linea de la factura aun no se ha acreditado --
        solo cuentan las notas en estado 'aceptada' (varias notas parciales
        pueden coexistir sobre la misma factura)."""
        acreditado = dict(
            self.db.execute(
                select(NotaCreditoLinea.factura_linea_id, func.sum(NotaCreditoLinea.cantidad))
                .join(NotaCredito, NotaCreditoLinea.nota_credito_id == NotaCredito.id)
                .where(NotaCredito.factura_id == factura.id, NotaCredito.estado == "aceptada")
                .group_by(NotaCreditoLinea.factura_linea_id)
            ).all()
        )
        return {
            linea.id: float(linea.cantidad) - float(acreditado.get(linea.id, 0)) for linea in factura.lineas
        }

    def _obtener_editable(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> NotaCredito:
        nota = self.obtener(empresa_id, nota_id)
        if nota.estado != "borrador":
            raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede editar una nota credito en estado borrador.")
        return nota

    def _construir_lineas(
        self, factura: Factura, lineas_data: list[LineaNotaCreditoRequest]
    ) -> list[NotaCreditoLinea]:
        disponibilidad = self.disponibilidad_lineas(factura)
        factura_lineas_por_id = {linea.id: linea for linea in factura.lineas}

        lineas = []
        for linea_data in lineas_data:
            factura_linea = factura_lineas_por_id.get(linea_data.factura_linea_id)
            if factura_linea is None:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, f"La linea {linea_data.factura_linea_id} no pertenece a esta factura."
                )
            disponible = disponibilidad.get(factura_linea.id, 0)
            if linea_data.cantidad > disponible:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"La cantidad a acreditar de '{factura_linea.descripcion}' ({linea_data.cantidad}) "
                    f"supera lo disponible ({disponible}).",
                )

            cantidad = linea_data.cantidad
            precio_unitario = float(factura_linea.precio_unitario)
            tarifa = float(factura_linea.tarifa_impuesto)
            subtotal_linea = round(cantidad * precio_unitario, 2)
            impuesto_linea = round(subtotal_linea * tarifa / 100, 2)

            lineas.append(
                NotaCreditoLinea(
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
    def _totales(lineas: list[NotaCreditoLinea]) -> tuple[float, float, float]:
        subtotal = round(sum(float(linea.subtotal_linea) for linea in lineas), 2)
        total_impuestos = round(sum(float(linea.impuesto_linea) for linea in lineas), 2)
        return subtotal, total_impuestos, round(subtotal + total_impuestos, 2)

    def crear_borrador(
        self, empresa_id: uuid.UUID, factura_id: uuid.UUID, data: CrearNotaCreditoRequest
    ) -> NotaCredito:
        factura = self._obtener_factura_aceptada(empresa_id, factura_id)
        lineas = self._construir_lineas(factura, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        nota = NotaCredito(
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
        self, empresa_id: uuid.UUID, nota_id: uuid.UUID, data: ActualizarNotaCreditoRequest
    ) -> NotaCredito:
        nota = self._obtener_editable(empresa_id, nota_id)
        factura = self._obtener_factura_aceptada(empresa_id, nota.factura_id)
        lineas = self._construir_lineas(factura, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

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

    def _incrementar_consecutivo(self, empresa_id: uuid.UUID, tipo: str = "credito") -> int:
        """INSERT ... ON CONFLICT DO UPDATE atomico -- a diferencia de
        ResolucionDian (una fila ya sembrada por empresa), aqui la fila de
        contador puede no existir todavia para esta empresa/tipo, asi que
        un UPDATE simple no alcanza en el primer envio."""
        stmt = insert(ConsecutivoNota).values(empresa_id=empresa_id, tipo=tipo, consecutivo_actual=1)
        stmt = stmt.on_conflict_do_update(
            index_elements=["empresa_id", "tipo"],
            set_={"consecutivo_actual": ConsecutivoNota.consecutivo_actual + 1},
        ).returning(ConsecutivoNota.consecutivo_actual)
        resultado = self.db.execute(stmt)
        consecutivo = resultado.scalar_one()
        self.db.commit()
        return consecutivo

    def enviar(self, empresa_id: uuid.UUID, nota_id: uuid.UUID) -> NotaCredito:
        nota = self._obtener_editable(empresa_id, nota_id)
        factura = self._obtener_factura_aceptada(empresa_id, nota.factura_id)
        empresa = self.db.get(Empresa, empresa_id)
        if not empresa or not empresa.id_alegra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta empresa aun no esta registrada en Alegra.")

        consecutivo = self._incrementar_consecutivo(empresa_id, "credito")
        payload = self._construir_payload_alegra(empresa, factura, nota, consecutivo)

        try:
            respuesta = self._alegra_client.create_credit_note(payload)
        except AlegraApiError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, map_alegra_error(exc.status_code, exc.body))

        self._aplicar_respuesta_envio(nota, consecutivo, respuesta)
        self.db.add(nota)
        # flush (sin commit) para que disponibilidad_lineas -- que consulta
        # NotaCredito.estado por SQL -- vea el "aceptada" recien asignado a
        # esta misma nota (la sesion de test usa autoflush=False).
        self.db.flush()
        if nota.estado == "aceptada":
            self._revisar_anulacion(factura)
            self.db.add(factura)

        self.db.commit()
        self.db.refresh(nota)
        return self.obtener(empresa_id, nota.id)

    def anular_factura(self, empresa_id: uuid.UUID, factura_id: uuid.UUID) -> NotaCredito:
        """Atajo: crea y envia de una sola vez una Nota Credito por el 100%
        de las lineas disponibles de la factura, con el motivo fijo
        "Anulacion del documento equivalente electronico"."""
        factura = self._obtener_factura_aceptada(empresa_id, factura_id)
        disponibilidad = self.disponibilidad_lineas(factura)
        lineas_data = [
            LineaNotaCreditoRequest(factura_linea_id=linea_id, cantidad=cantidad)
            for linea_id, cantidad in disponibilidad.items()
            if cantidad > 0
        ]
        if not lineas_data:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta factura ya esta completamente acreditada.")

        nota = self.crear_borrador(
            empresa_id, factura_id, CrearNotaCreditoRequest(motivo_codigo=MOTIVO_ANULACION, lineas=lineas_data)
        )
        return self.enviar(empresa_id, nota.id)

    def _revisar_anulacion(self, factura: Factura) -> None:
        disponibilidad = self.disponibilidad_lineas(factura)
        if all(cantidad <= 0 for cantidad in disponibilidad.values()):
            factura.estado = "anulada"

    @staticmethod
    def _aplicar_respuesta_envio(nota: NotaCredito, consecutivo: int, respuesta: dict) -> None:
        credit_note = respuesta.get("creditNote") or {}
        nota.consecutivo = consecutivo
        nota.numero_completo = f"{PREFIJO_NOTA_CREDITO}-{consecutivo:06d}"
        nota.alegra_credit_note_id = credit_note.get("id")
        nota.cude = credit_note.get("cude")
        nota.qr_code_content = credit_note.get("qrCodeContent")
        nota.fecha_envio = datetime.now(timezone.utc)

        government_response = credit_note.get("governmentResponse") or {}
        nota.notificaciones_dian = government_response.get("errorMessages") or None

        legal_status = credit_note.get("legalStatus")
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
    def _construir_payload_alegra(empresa: Empresa, factura: Factura, nota: NotaCredito, consecutivo: int) -> dict:
        # El prefijo de la factura original se deriva de numero_completo (no
        # de la Resolucion DIAN actual): el prefijo pudo cambiar despues de
        # emitida esa factura, y associatedDocuments debe reflejar el
        # prefijo REAL usado en ese envio, no el vigente hoy.
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
                {
                    "paymentForm": factura.forma_pago or "1",
                    "paymentMethod": factura.metodo_pago or "10",
                    "amount": float(nota.total),
                }
            ],
        }
