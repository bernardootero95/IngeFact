"""Lectura del XML UBL (DIAN) de una factura electronica de venta.

Se usa en Facturas Recibidas: Alegra (GET /get-by-trackid) devuelve el XML
que reposa en la DIAN para un CUFE, y de ahi sale el resumen que ve el
tenant (numero, proveedor, fechas, forma de pago, total). Funcion pura, sin
BD ni red, para poder probarla con XML fijos.
"""

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date

NS = {
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "sts": "dian:gov:co:facturaelectronica:Structures-2-1",
}

# Tabla DIAN de formas de pago (PaymentMeans/ID).
FORMA_PAGO_CONTADO = "1"
FORMA_PAGO_CREDITO = "2"
FORMA_PAGO_LABELS = {FORMA_PAGO_CONTADO: "Contado", FORMA_PAGO_CREDITO: "Crédito"}


class FacturaUblInvalida(ValueError):
    """El XML no es una factura electronica de venta legible."""


@dataclass(frozen=True)
class ResumenFacturaUbl:
    numero: str
    prefijo: str | None
    fecha: date
    fecha_vencimiento: date | None
    forma_pago: str | None
    proveedor_nombre: str
    proveedor_nit: str
    adquiriente_nit: str | None
    total: float


def _texto(nodo: ET.Element | None, ruta: str) -> str | None:
    if nodo is None:
        return None
    encontrado = nodo.find(ruta, NS)
    if encontrado is None or encontrado.text is None:
        return None
    return encontrado.text.strip() or None


def _fecha(valor: str | None) -> date | None:
    if not valor:
        return None
    try:
        return date.fromisoformat(valor[:10])
    except ValueError:
        return None


def _extraer_invoice(raiz: ET.Element) -> ET.Element:
    """La DIAN puede devolver la factura directa (<Invoice>) o envuelta en un
    <AttachedDocument> con el XML de la factura como texto dentro de
    cac:Attachment/cac:ExternalReference/cbc:Description."""
    nombre = raiz.tag.rsplit("}", 1)[-1]
    if nombre == "Invoice":
        return raiz
    if nombre == "AttachedDocument":
        embebido = _texto(raiz, "cac:Attachment/cac:ExternalReference/cbc:Description")
        if embebido:
            return _extraer_invoice(ET.fromstring(embebido))
    raise FacturaUblInvalida("El documento consultado no es una factura electrónica de venta.")


def _parte(invoice: ET.Element, grupo: str) -> ET.Element | None:
    return invoice.find(f"cac:{grupo}/cac:Party", NS)


def parsear_factura_ubl(xml: bytes | str) -> ResumenFacturaUbl:
    try:
        invoice = _extraer_invoice(ET.fromstring(xml))
    except ET.ParseError as exc:
        raise FacturaUblInvalida("No se pudo leer el XML de la factura.") from exc

    numero = _texto(invoice, "cbc:ID")
    fecha = _fecha(_texto(invoice, "cbc:IssueDate"))
    proveedor = _parte(invoice, "AccountingSupplierParty")
    adquiriente = _parte(invoice, "AccountingCustomerParty")
    proveedor_nombre = _texto(proveedor, "cac:PartyTaxScheme/cbc:RegistrationName") or _texto(
        proveedor, "cac:PartyLegalEntity/cbc:RegistrationName"
    )
    proveedor_nit = _texto(proveedor, "cac:PartyTaxScheme/cbc:CompanyID")
    total = _texto(invoice, "cac:LegalMonetaryTotal/cbc:PayableAmount")

    if not (numero and fecha and proveedor_nombre and proveedor_nit and total):
        raise FacturaUblInvalida("El XML de la factura no trae los datos mínimos (número, fecha, proveedor, total).")

    pago = invoice.find("cac:PaymentMeans", NS)
    return ResumenFacturaUbl(
        numero=numero,
        prefijo=_texto(invoice, ".//sts:Prefix"),
        fecha=fecha,
        fecha_vencimiento=_fecha(_texto(pago, "cbc:PaymentDueDate") or _texto(invoice, "cbc:DueDate")),
        forma_pago=_texto(pago, "cbc:ID"),
        proveedor_nombre=proveedor_nombre,
        proveedor_nit=proveedor_nit,
        adquiriente_nit=_texto(adquiriente, "cac:PartyTaxScheme/cbc:CompanyID"),
        total=float(total),
    )
