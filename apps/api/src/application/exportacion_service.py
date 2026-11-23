"""Descarga de toda la informacion de una empresa en un libro de Excel.

Es la salida que tiene el cliente con el plan vencido (y la que puede usar
en cualquier momento): documentos emitidos, eventos que envio desde
IngeFact sobre sus facturas de compra, terceros y productos. Una hoja por
tipo; los registros eliminados no se incluyen. El PDF y el XML de cada
documento se siguen bajando desde sus propios endpoints."""

import io
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Callable, Iterable

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.core.tiempo import ZONA_HORARIA_COLOMBIA
from src.domain.factura_recibida import ORIGEN_INGEFACT, TIPO_EVENTO_LABELS
from src.infrastructure.db.models import (
    Cliente,
    DocumentoSoporte,
    Empleado,
    EventoReceptor,
    Factura,
    FacturaRecibida,
    Nomina,
    NotaCredito,
    NotaDebito,
    Producto,
    Proveedor,
)

ESTADO_LABELS = {
    "borrador": "Borrador",
    "enviada": "En validación DIAN",
    "aceptada": "Aceptada",
    "rechazada": "Rechazada",
    "anulada": "Anulada",
    "activo": "Activo",
    "inactivo": "Inactivo",
}

ENCABEZADO_FONT = Font(bold=True, color="FFFFFF")
ENCABEZADO_FILL = PatternFill("solid", fgColor="1F6F5C")
ANCHO_MAXIMO_COLUMNA = 60


@dataclass(frozen=True)
class Hoja:
    titulo: str
    columnas: tuple[str, ...]
    filas: Iterable[tuple[Any, ...]]


def _estado(valor: str | None) -> str:
    return ESTADO_LABELS.get(valor or "", valor or "")


def _fecha_hora(valor: datetime | None) -> datetime | None:
    """Excel no admite datetimes con zona: se pasa a hora de Colombia."""
    if valor is None:
        return None
    return valor.astimezone(ZONA_HORARIA_COLOMBIA).replace(tzinfo=None)


def _nombre_empleado(empleado: Empleado | None) -> str:
    if empleado is None:
        return ""
    partes = (empleado.primer_nombre, empleado.otros_nombres, empleado.primer_apellido, empleado.segundo_apellido)
    return " ".join(p for p in partes if p)


class ExportacionService:
    def __init__(self, db: Session):
        self.db = db

    def libro_excel(self, empresa_id: uuid.UUID) -> bytes:
        libro = Workbook()
        libro.remove(libro.active)
        for hoja in self._hojas(empresa_id):
            self._escribir_hoja(libro, hoja)
        salida = io.BytesIO()
        libro.save(salida)
        return salida.getvalue()

    def _hojas(self, empresa_id: uuid.UUID) -> list[Hoja]:
        constructores: tuple[Callable[[uuid.UUID], Hoja], ...] = (
            self._facturas,
            self._detalle_facturas,
            self._notas_credito,
            self._notas_debito,
            self._documentos_soporte,
            self._nomina,
            self._eventos,
            self._clientes,
            self._proveedores,
            self._empleados,
            self._productos,
        )
        return [construir(empresa_id) for construir in constructores]

    def _vigentes(self, modelo, empresa_id: uuid.UUID, *opciones, orden=None) -> list:
        query = select(modelo).where(modelo.empresa_id == empresa_id, modelo.eliminado.is_(None))
        if opciones:
            query = query.options(*opciones)
        query = query.order_by(orden if orden is not None else modelo.creado)
        return list(self.db.execute(query).scalars().all())

    # --- Documentos emitidos -------------------------------------------------

    def _facturas(self, empresa_id: uuid.UUID) -> Hoja:
        facturas = self._vigentes(Factura, empresa_id, selectinload(Factura.cliente), orden=Factura.fecha)
        return Hoja(
            "Facturas",
            ("Número", "Fecha", "Cliente", "Identificación cliente", "Estado", "Forma de pago", "Método de pago",
             "Vencimiento", "Subtotal", "Impuestos", "Total", "CUFE", "Enviada a la DIAN", "Notas"),
            (
                (f.numero_completo, f.fecha, f.cliente.nombre if f.cliente else "",
                 f.cliente.numero_identificacion if f.cliente else "", _estado(f.estado), f.forma_pago,
                 f.metodo_pago, f.fecha_vencimiento, f.subtotal, f.total_impuestos, f.total, f.cufe,
                 _fecha_hora(f.fecha_envio), f.notas)
                for f in facturas
            ),
        )

    def _detalle_facturas(self, empresa_id: uuid.UUID) -> Hoja:
        facturas = self._vigentes(Factura, empresa_id, selectinload(Factura.lineas), orden=Factura.fecha)
        return Hoja(
            "Detalle facturas",
            ("Factura", "Fecha", "Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Tributo",
             "Tarifa (%)", "Subtotal", "Impuesto", "Total"),
            (
                (f.numero_completo, f.fecha, linea.codigo, linea.descripcion, linea.unidad_medida, linea.cantidad,
                 linea.precio_unitario, linea.tributo, linea.tarifa_impuesto, linea.subtotal_linea,
                 linea.impuesto_linea, linea.total_linea)
                for f in facturas
                for linea in f.lineas
            ),
        )

    def _nota(self, modelo, titulo: str, empresa_id: uuid.UUID) -> Hoja:
        notas = self._vigentes(
            modelo, empresa_id, selectinload(modelo.cliente), selectinload(modelo.factura), orden=modelo.fecha
        )
        return Hoja(
            titulo,
            ("Número", "Fecha", "Factura afectada", "Cliente", "Identificación cliente", "Motivo (código DIAN)",
             "Estado", "Subtotal", "Impuestos", "Total", "CUDE", "Enviada a la DIAN"),
            (
                (n.numero_completo, n.fecha, n.factura.numero_completo if n.factura else "",
                 n.cliente.nombre if n.cliente else "", n.cliente.numero_identificacion if n.cliente else "",
                 n.motivo_codigo, _estado(n.estado), n.subtotal, n.total_impuestos, n.total, n.cude,
                 _fecha_hora(n.fecha_envio))
                for n in notas
            ),
        )

    def _notas_credito(self, empresa_id: uuid.UUID) -> Hoja:
        return self._nota(NotaCredito, "Notas crédito", empresa_id)

    def _notas_debito(self, empresa_id: uuid.UUID) -> Hoja:
        return self._nota(NotaDebito, "Notas débito", empresa_id)

    def _documentos_soporte(self, empresa_id: uuid.UUID) -> Hoja:
        documentos = self._vigentes(
            DocumentoSoporte, empresa_id, selectinload(DocumentoSoporte.proveedor), orden=DocumentoSoporte.fecha
        )
        return Hoja(
            "Documentos soporte",
            ("Número", "Fecha", "Proveedor", "Identificación proveedor", "Estado", "Forma de pago",
             "Método de pago", "Subtotal", "Impuestos", "Total", "CUDS", "Enviado a la DIAN"),
            (
                (d.numero_completo, d.fecha, d.proveedor.nombre if d.proveedor else "",
                 d.proveedor.numero_identificacion if d.proveedor else "", _estado(d.estado), d.forma_pago,
                 d.metodo_pago, d.subtotal, d.total_impuestos, d.total, d.cuds, _fecha_hora(d.fecha_envio))
                for d in documentos
            ),
        )

    def _nomina(self, empresa_id: uuid.UUID) -> Hoja:
        nominas = self._vigentes(
            Nomina, empresa_id, selectinload(Nomina.empleado), orden=Nomina.fecha_liquidacion_inicio
        )
        return Hoja(
            "Nómina",
            ("Número", "Empleado", "Documento empleado", "Periodo desde", "Periodo hasta", "Estado", "Devengados",
             "Deducciones", "Total comprobante", "CUNE", "Enviada a la DIAN", "Número anulación",
             "CUNE anulación"),
            (
                (n.numero_completo, _nombre_empleado(n.empleado), n.empleado.numero_documento if n.empleado else "",
                 n.fecha_liquidacion_inicio, n.fecha_liquidacion_fin, _estado(n.estado), n.devengados_total,
                 n.deducciones_total, n.comprobante_total, n.cune, _fecha_hora(n.fecha_envio),
                 n.numero_completo_anulacion, n.cune_anulacion)
                for n in nominas
            ),
        )

    def _eventos(self, empresa_id: uuid.UUID) -> Hoja:
        """Solo los eventos que la empresa envio desde IngeFact (no los que
        trae la DIAN de otros sistemas) sobre sus facturas de compra."""
        eventos = self.db.execute(
            select(EventoReceptor)
            .join(FacturaRecibida, EventoReceptor.factura_recibida_id == FacturaRecibida.id)
            .where(
                FacturaRecibida.empresa_id == empresa_id,
                FacturaRecibida.eliminado.is_(None),
                EventoReceptor.origen == ORIGEN_INGEFACT,
            )
            .options(selectinload(EventoReceptor.factura_recibida))
            .order_by(EventoReceptor.creado)
        ).scalars().all()
        return Hoja(
            "Eventos facturas compra",
            ("Fecha", "Evento", "Número evento", "Estado DIAN", "CUDE", "Proveedor", "NIT proveedor",
             "Factura del proveedor", "CUFE factura", "Notas"),
            (
                (_fecha_hora(e.creado), TIPO_EVENTO_LABELS.get(e.tipo, e.tipo), e.numero, e.legal_status, e.cude,
                 e.factura_recibida.proveedor_nombre, e.factura_recibida.proveedor_nit,
                 e.factura_recibida.numero_documento_proveedor, e.factura_recibida.cufe, e.notas)
                for e in eventos
            ),
        )

    # --- Terceros y productos ----------------------------------------------

    def _clientes(self, empresa_id: uuid.UUID) -> Hoja:
        return Hoja(
            "Clientes",
            ("Tipo identificación", "Número identificación", "DV", "Nombre", "Correo", "Teléfono",
             "Tipo organización", "Régimen fiscal", "Tributo", "Estado"),
            (
                (c.tipo_identificacion, c.numero_identificacion, c.digito_verificacion, c.nombre,
                 c.correo_electronico, c.telefono, c.tipo_organizacion, c.regimen_fiscal, c.tributo,
                 _estado(c.estado))
                for c in self._vigentes(Cliente, empresa_id, orden=Cliente.nombre)
            ),
        )

    def _proveedores(self, empresa_id: uuid.UUID) -> Hoja:
        return Hoja(
            "Proveedores",
            ("Tipo identificación", "Número identificación", "DV", "Nombre", "Correo", "Teléfono", "Dirección",
             "Departamento", "Municipio", "Tipo organización", "Régimen fiscal", "Tributo", "Estado"),
            (
                (p.tipo_identificacion, p.numero_identificacion, p.digito_verificacion, p.nombre,
                 p.correo_electronico, p.telefono, p.direccion, p.departamento, p.municipio, p.tipo_organizacion,
                 p.regimen_fiscal, p.tributo, _estado(p.estado))
                for p in self._vigentes(Proveedor, empresa_id, orden=Proveedor.nombre)
            ),
        )

    def _empleados(self, empresa_id: uuid.UUID) -> Hoja:
        return Hoja(
            "Empleados",
            ("Tipo documento", "Número documento", "Nombre", "Tipo trabajador", "Tipo contrato", "Sueldo",
             "Salario integral", "Fecha ingreso", "Fecha retiro", "Banco", "Tipo cuenta", "Número cuenta",
             "Correo", "Teléfono", "Municipio trabajo", "Dirección trabajo", "Estado"),
            (
                (e.tipo_documento, e.numero_documento, _nombre_empleado(e), e.tipo_trabajador, e.tipo_contrato,
                 e.sueldo, "Sí" if e.salario_integral else "No", e.fecha_ingreso, e.fecha_retiro, e.banco,
                 e.tipo_cuenta, e.numero_cuenta, e.correo_electronico, e.telefono, e.lugar_trabajo_municipio,
                 e.lugar_trabajo_direccion, _estado(e.estado))
                for e in self._vigentes(Empleado, empresa_id, orden=Empleado.primer_apellido)
            ),
        )

    def _productos(self, empresa_id: uuid.UUID) -> Hoja:
        return Hoja(
            "Productos",
            ("Tipo", "Código", "Nombre", "Descripción", "Precio", "Unidad", "Tributo", "Tarifa (%)", "Estado"),
            (
                (p.tipo, p.codigo, p.nombre, p.descripcion, p.precio, p.unidad_medida, p.tributo,
                 p.tarifa_impuesto, _estado(p.estado))
                for p in self._vigentes(Producto, empresa_id, orden=Producto.nombre)
            ),
        )

    # --- Escritura ----------------------------------------------------------

    @staticmethod
    def _escribir_hoja(libro: Workbook, hoja: Hoja) -> None:
        ws = libro.create_sheet(hoja.titulo[:31])
        ws.append(list(hoja.columnas))
        for celda in ws[1]:
            celda.font = ENCABEZADO_FONT
            celda.fill = ENCABEZADO_FILL
        anchos = [len(c) for c in hoja.columnas]
        for fila in hoja.filas:
            ws.append(list(fila))
            for i, valor in enumerate(fila):
                anchos[i] = max(anchos[i], len(str(valor)) if valor is not None else 0)
        for i, ancho in enumerate(anchos, start=1):
            ws.column_dimensions[get_column_letter(i)].width = min(ancho + 2, ANCHO_MAXIMO_COLUMNA)
        for fila in ws.iter_rows(min_row=2):
            for celda in fila:
                if isinstance(celda.value, datetime):
                    celda.number_format = "dd/mm/yyyy hh:mm"
                elif isinstance(celda.value, date):
                    celda.number_format = "dd/mm/yyyy"
        ws.freeze_panes = "A2"
        if ws.max_row > 1:
            ws.auto_filter.ref = ws.dimensions
