import base64
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.xml_utils import extraer_emisor_factura_ubl, extraer_lineas_factura_ubl
from src.domain.compra import (
    ConsultarCufeLineaSugerida,
    ConsultarCufeMontoReferencia,
    ConsultarCufeProveedorSugerido,
    ConsultarCufeResponse,
    CrearCompraRequest,
    LineaCompraRequest,
)
from src.infrastructure.db.models import Compra, CompraLinea, DocumentoSoporte, Producto, Proveedor


class CompraService:
    """Registro interno de Compras a proveedores. Scoping por empresa_id
    siempre sale del JWT (tenant.empresa_id), nunca de un campo que mande el
    cliente -- mismo criterio que FacturaService. A diferencia de Factura,
    no hay envio a Alegra ni estados intermedios: se registra directo como
    'registrada' y solo puede pasar a 'anulada'."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client or AlegraClient()

    def listar(self, empresa_id: uuid.UUID, estado: str | None = None, proveedor_id: uuid.UUID | None = None) -> list[Compra]:
        query = (
            select(Compra)
            .where(Compra.empresa_id == empresa_id, Compra.eliminado.is_(None))
            .options(selectinload(Compra.proveedor))
            .order_by(Compra.creado.desc())
        )
        if estado:
            query = query.where(Compra.estado == estado)
        if proveedor_id:
            query = query.where(Compra.proveedor_id == proveedor_id)
        return list(self.db.execute(query).scalars().all())

    def obtener(self, empresa_id: uuid.UUID, compra_id: uuid.UUID) -> Compra:
        compra = self.db.execute(
            select(Compra)
            .where(Compra.id == compra_id, Compra.empresa_id == empresa_id, Compra.eliminado.is_(None))
            .options(selectinload(Compra.proveedor), selectinload(Compra.lineas))
        ).scalar_one_or_none()
        if compra is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Compra no encontrada.")
        return compra

    def obtener_documento_soporte_id(self, compra_id: uuid.UUID) -> uuid.UUID | None:
        """Id del Documento Soporte NO eliminado ligado a esta compra, si
        existe -- usado para que el frontend ofrezca "Ver Documento
        Soporte" en vez de "Generar" cuando ya hay uno (Fase 5)."""
        return self.db.execute(
            select(DocumentoSoporte.id).where(
                DocumentoSoporte.compra_id == compra_id, DocumentoSoporte.eliminado.is_(None)
            )
        ).scalar_one_or_none()

    def _validar_cufe_unico(self, empresa_id: uuid.UUID, cufe: str) -> None:
        existente = self.db.execute(
            select(Compra).where(Compra.empresa_id == empresa_id, Compra.cufe == cufe, Compra.eliminado.is_(None))
        ).scalar_one_or_none()
        if existente is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya registraste una compra con ese CUFE.")

    def consultar_cufe(self, empresa_id: uuid.UUID, cufe: str) -> ConsultarCufeResponse:
        """Vista previa (no persiste nada) para prellenar el formulario de
        Compra a partir del CUFE de una factura electronica real (Fase 5).
        `proveedor_sugerido`/`lineas` vienen en None cuando Alegra no tiene
        custodia del XML de ese documento (caso normal para un proveedor
        externo real, ver docs/alegra-investigacion.md) -- el frontend debe
        seguir el flujo manual en ese caso, no es un error."""
        try:
            respuesta = self._alegra_client.get_by_track_id(cufe)
        except AlegraApiError as exc:
            if exc.status_code == 404:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, "No se encontró ningún documento con ese CUFE ante la DIAN."
                ) from exc
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Alegra rechazó la consulta de ese CUFE.") from exc
        except AlegraTransientError as exc:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Alegra no esta respondiendo en este momento. Intenta de nuevo en unos minutos.",
            ) from exc

        document = respuesta.get("document") or {}
        if (respuesta.get("dianStatus") or "").upper() == "NOT_FOUND":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No se encontró ningún documento con ese CUFE ante la DIAN.")

        proveedor_sugerido = None
        lineas_sugeridas = None
        xml_doc = respuesta.get("xmlDocument") or {}
        if xml_doc.get("format") == "base64" and xml_doc.get("content"):
            xml_bytes = base64.b64decode(xml_doc["content"])
            emisor = extraer_emisor_factura_ubl(xml_bytes)
            if emisor is not None:
                proveedor_existente = self.db.execute(
                    select(Proveedor.id).where(
                        Proveedor.empresa_id == empresa_id,
                        Proveedor.numero_identificacion == emisor["numero_identificacion"],
                        Proveedor.eliminado.is_(None),
                    )
                ).scalar_one_or_none()
                proveedor_sugerido = ConsultarCufeProveedorSugerido(
                    nombre=emisor["nombre"],
                    tipo_identificacion=emisor["tipo_identificacion"],
                    numero_identificacion=emisor["numero_identificacion"],
                    proveedor_id_existente=str(proveedor_existente) if proveedor_existente else None,
                )
            lineas_crudas = extraer_lineas_factura_ubl(xml_bytes)
            lineas_sugeridas = [
                ConsultarCufeLineaSugerida(
                    descripcion=linea["descripcion"],
                    cantidad=linea["cantidad"],
                    unidad_medida=linea["unidad_medida"],
                    precio_unitario=linea["precio_unitario"],
                    tributo=linea["tributo"],
                    tarifa_impuesto=linea["tarifa_impuesto"],
                )
                for linea in lineas_crudas
            ]

        return ConsultarCufeResponse(
            fecha=document.get("documentDate"),
            numero_documento_proveedor=document.get("documentNumber"),
            monto_referencia=ConsultarCufeMontoReferencia(
                subtotal=document.get("subtotal"),
                impuestos=document.get("taxTotal"),
                total=document.get("total"),
            ),
            proveedor_sugerido=proveedor_sugerido,
            lineas=lineas_sugeridas,
        )

    def _validar_proveedor(self, empresa_id: uuid.UUID, proveedor_id: uuid.UUID) -> Proveedor:
        proveedor = self.db.execute(
            select(Proveedor).where(
                Proveedor.id == proveedor_id, Proveedor.empresa_id == empresa_id, Proveedor.eliminado.is_(None)
            )
        ).scalar_one_or_none()
        if proveedor is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado.")
        return proveedor

    def _construir_lineas(self, empresa_id: uuid.UUID, lineas_data: list[LineaCompraRequest]) -> list[CompraLinea]:
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
            tarifa = float(producto.tarifa_impuesto)
            subtotal_linea = round(cantidad * precio_unitario, 2)
            impuesto_linea = round(subtotal_linea * tarifa / 100, 2)

            lineas.append(
                CompraLinea(
                    producto_id=producto.id,
                    codigo=producto.codigo,
                    descripcion=producto.descripcion or producto.nombre,
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
    def _totales(lineas: list[CompraLinea]) -> tuple[float, float, float]:
        subtotal = round(sum(float(linea.subtotal_linea) for linea in lineas), 2)
        total_impuestos = round(sum(float(linea.impuesto_linea) for linea in lineas), 2)
        return subtotal, total_impuestos, round(subtotal + total_impuestos, 2)

    def crear(self, empresa_id: uuid.UUID, data: CrearCompraRequest) -> Compra:
        self._validar_proveedor(empresa_id, data.proveedor_id)
        if data.cufe:
            self._validar_cufe_unico(empresa_id, data.cufe)
        lineas = self._construir_lineas(empresa_id, data.lineas)
        subtotal, total_impuestos, total = self._totales(lineas)

        compra = Compra(
            empresa_id=empresa_id,
            proveedor_id=data.proveedor_id,
            fecha=data.fecha,
            numero_documento_proveedor=data.numero_documento_proveedor,
            cufe=data.cufe,
            observaciones=data.observaciones,
            estado="registrada",
            subtotal=subtotal,
            total_impuestos=total_impuestos,
            total=total,
            lineas=lineas,
        )
        self.db.add(compra)
        self.db.commit()
        self.db.refresh(compra)
        return self.obtener(empresa_id, compra.id)

    def anular(self, empresa_id: uuid.UUID, compra_id: uuid.UUID) -> Compra:
        compra = self.obtener(empresa_id, compra_id)
        if compra.estado == "anulada":
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta compra ya esta anulada.")
        compra.estado = "anulada"
        self.db.add(compra)
        self.db.commit()
        self.db.refresh(compra)
        return compra

    def eliminar(self, empresa_id: uuid.UUID, compra_id: uuid.UUID) -> None:
        compra = self.obtener(empresa_id, compra_id)
        compra.eliminado = datetime.now(timezone.utc)
        self.db.add(compra)
        self.db.commit()
