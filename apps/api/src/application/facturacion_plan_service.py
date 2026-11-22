"""Factura electronica automatica de los paquetes de documentos vendidos.

Cada venta (VentaPaquete) la factura la empresa facturadora (por defecto la
del titular del negocio, ver ConfiguracionService.empresa_facturadora) a la
empresa que compro el paquete, con el mismo flujo que usa cualquier tenant
(FacturaService): borrador + envio a la DIAN.

Decisiones del usuario (2026-11-22): se factura en cada venta, de contado
por transferencia, y si la factura no sale el plan queda guardado igual: el
motivo se guarda en la venta y el admin puede reintentar.
"""

import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.application.configuracion_service import ConfiguracionService
from src.application.factura_service import FacturaService
from src.application.producto_service import ProductoService
from src.core.alegra_client import AlegraClient
from src.core.tiempo import hoy_colombia
from src.domain.factura import CrearFacturaRequest, LineaFacturaRequest
from src.domain.factura_externa import ItemFacturaExternaRequest
from src.domain.facturacion_plan import (
    CODIGO_PRODUCTO_PAQUETE,
    FORMA_PAGO_CONTADO,
    METODO_PAGO_TRANSFERENCIA,
    UNIDAD_MEDIDA_UNIDAD,
    descripcion_paquete,
)
from src.infrastructure.db.models import Cliente, Empresa, Factura, VentaPaquete

logger = logging.getLogger(__name__)

# Estados de la factura con los que la venta ya quedo facturada: reintentar
# no debe emitir otra.
ESTADOS_YA_FACTURADA = ("aceptada", "enviada", "anulada")

SIN_FACTURADORA = (
    "No hay empresa facturadora configurada. Elígela en Configuración para facturar los paquetes."
)
SIN_CORREO = "La empresa no tiene correo electrónico: es obligatorio para enviarle la factura."
ERROR_INESPERADO = "Error inesperado al emitir la factura. Intenta de nuevo."


class FacturacionPlanService:
    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self._alegra_client = alegra_client

    def listar_ventas(self, empresa_id: uuid.UUID) -> list[tuple[VentaPaquete, Factura | None]]:
        """Ventas de paquetes de la empresa (la mas reciente primero) con su factura."""
        filas = self.db.execute(
            select(VentaPaquete, Factura)
            .outerjoin(Factura, Factura.id == VentaPaquete.factura_id)
            .where(VentaPaquete.empresa_id == empresa_id)
            .order_by(VentaPaquete.creado.desc())
        ).all()
        return [(venta, factura) for venta, factura in filas]

    def obtener_venta(self, empresa_id: uuid.UUID, venta_id: uuid.UUID) -> VentaPaquete:
        venta = self.db.execute(
            select(VentaPaquete).where(VentaPaquete.id == venta_id, VentaPaquete.empresa_id == empresa_id)
        ).scalar_one_or_none()
        if venta is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Venta de paquete no encontrada.")
        return venta

    def factura_de(self, venta: VentaPaquete) -> Factura | None:
        return self.db.get(Factura, venta.factura_id) if venta.factura_id else None

    def facturar(self, venta: VentaPaquete) -> VentaPaquete:
        """Emite (o reintenta) la factura de la venta. Nunca lanza: si algo
        falla deja el motivo en venta.factura_error."""
        try:
            self._facturar(venta)
            venta.factura_error = None
        except HTTPException as exc:
            self.db.rollback()
            venta.factura_error = str(exc.detail)
        except Exception:  # noqa: BLE001 -- la venta ya esta guardada, no se pierde por esto
            self.db.rollback()
            logger.exception("Fallo inesperado facturando la venta de paquete %s", venta.id)
            venta.factura_error = ERROR_INESPERADO
        self.db.add(venta)
        self.db.commit()
        self.db.refresh(venta)
        return venta

    def _facturar(self, venta: VentaPaquete) -> None:
        factura = self.factura_de(venta)
        if factura is not None and factura.estado in ESTADOS_YA_FACTURADA:
            return

        facturadora = ConfiguracionService(self.db).empresa_facturadora()
        if facturadora is None:
            raise HTTPException(status.HTTP_409_CONFLICT, SIN_FACTURADORA)
        if not aplica_factura(venta, facturadora):
            return

        facturas = FacturaService(self.db, self._alegra_client)
        if factura is None:
            factura = self._crear_borrador(facturas, facturadora, venta)
            venta.factura_id = factura.id
            self.db.add(venta)
            self.db.commit()
        facturas.enviar(facturadora.id, factura.id, FORMA_PAGO_CONTADO, METODO_PAGO_TRANSFERENCIA)

    def _crear_borrador(self, facturas: FacturaService, facturadora: Empresa, venta: VentaPaquete) -> Factura:
        comprador = self.db.get(Empresa, venta.empresa_id)
        cliente = self._obtener_o_crear_cliente(facturadora, comprador)
        descripcion = descripcion_paquete(venta.max_documentos, venta.fecha_inicio, venta.fecha_fin)
        producto = ProductoService(self.db).obtener_o_crear(
            facturadora.id,
            ItemFacturaExternaRequest(
                codigo=CODIGO_PRODUCTO_PAQUETE,
                nombre="Paquete de documentos electrónicos IngeFact",
                tipo="servicio",
                descripcion=descripcion,
                unidad_medida=UNIDAD_MEDIDA_UNIDAD,
                cantidad=1,
                precio_unitario=float(venta.precio),
            ),
        )
        return facturas.crear_borrador(
            facturadora.id,
            CrearFacturaRequest(
                cliente_id=cliente.id,
                fecha=hoy_colombia(),
                lineas=[LineaFacturaRequest(producto_id=producto.id, cantidad=1, precio_unitario=float(venta.precio))],
            ),
        )

    def _obtener_o_crear_cliente(self, facturadora: Empresa, comprador: Empresa) -> Cliente:
        """El comprador queda como cliente de la facturadora (uno por NIT).
        Si ya existe se actualizan sus datos con los de la empresa, que son
        los que el admin mantiene al dia."""
        if not comprador.correo_electronico:
            raise HTTPException(status.HTTP_409_CONFLICT, SIN_CORREO)
        cliente = self.db.execute(
            select(Cliente).where(
                Cliente.empresa_id == facturadora.id,
                Cliente.numero_identificacion == comprador.numero_identificacion,
                Cliente.eliminado.is_(None),
            )
        ).scalar_one_or_none()
        if cliente is None:
            cliente = Cliente(empresa_id=facturadora.id, numero_identificacion=comprador.numero_identificacion)
        es_nit = comprador.tipo_identificacion == "31"
        cliente.tipo_identificacion = comprador.tipo_identificacion
        cliente.digito_verificacion = comprador.digito_verificacion if es_nit else None
        cliente.nombre = comprador.razon_social
        cliente.correo_electronico = comprador.correo_electronico
        cliente.telefono = comprador.telefono
        cliente.tipo_organizacion = comprador.tipo_organizacion
        cliente.regimen_fiscal = comprador.regimen_fiscal
        cliente.regimen = comprador.regimen
        cliente.tributo = "01" if comprador.regimen_fiscal == "48" else "ZZ"
        self.db.add(cliente)
        self.db.commit()
        self.db.refresh(cliente)
        return cliente


def aplica_factura(venta: VentaPaquete, facturadora: Empresa) -> bool:
    """La facturadora no se factura a si misma ni se facturan paquetes sin precio."""
    return venta.empresa_id != facturadora.id and float(venta.precio) > 0
