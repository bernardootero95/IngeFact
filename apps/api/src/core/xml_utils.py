import xml.etree.ElementTree as ET

# Namespaces UBL 2.1 reales de un XML de factura de Alegra (confirmados
# contra un documento real via GET /get-by-trackid, Fase 5) -- a diferencia
# de extraer_firma_digital (busca por local-name porque el prefijo de la
# firma puede variar), aqui se usan namespaces explicitos porque cac/cbc son
# estables en todo documento UBL de la DIAN, mismo enfoque ya verificado en
# produccion por el proyecto hermano "REPORTES FACTURA DIAN".
_NS = {
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
}


def extraer_firma_digital(xml_bytes: bytes) -> str | None:
    """Busca <ds:SignatureValue> en un XML firmado por Alegra, por
    local-name namespace-agnostico (el prefijo puede variar) -- verificado
    contra XML reales de facturas y notas credito en el sandbox. Compartido
    entre FacturaService/NotaCreditoService/NotaDebitoService."""
    root = ET.fromstring(xml_bytes)
    for elem in root.iter():
        local_name = elem.tag.rsplit("}", 1)[-1]
        if local_name == "SignatureValue" and elem.text:
            return elem.text.strip()
    return None


def extraer_lineas_factura_ubl(xml_bytes: bytes) -> list[dict]:
    """Extrae las lineas (cac:InvoiceLine) de un XML UBL 2.1 de factura --
    usado por CompraService.consultar_cufe (Fase 5) para prellenar una
    Compra a partir del CUFE de una factura electronica real. Estructura
    verificada contra un XML real de Alegra (ver
    tests/fixtures/factura_ubl_sample.xml): cada linea trae descripcion,
    cantidad+unidad, precio unitario, y el desglose de impuesto de esa
    linea (si tiene). Devuelve dicts con valores crudos (str/float), sin
    redondear ni validar -- eso es responsabilidad del llamador."""
    root = ET.fromstring(xml_bytes)
    lineas = []
    for linea in root.findall("cac:InvoiceLine", _NS):
        item = linea.find("cac:Item", _NS)
        price = linea.find("cac:Price", _NS)
        cantidad_elem = linea.find("cbc:InvoicedQuantity", _NS)
        tax_total = linea.find("cac:TaxTotal", _NS)

        tributo = None
        tarifa_impuesto = 0.0
        impuesto_linea = 0.0
        if tax_total is not None:
            impuesto_linea = float(tax_total.findtext("cbc:TaxAmount", default="0", namespaces=_NS))
            tax_subtotal = tax_total.find("cac:TaxSubtotal", _NS)
            if tax_subtotal is not None:
                categoria = tax_subtotal.find("cac:TaxCategory", _NS)
                if categoria is not None:
                    tarifa_impuesto = float(categoria.findtext("cbc:Percent", default="0", namespaces=_NS))
                    tributo = categoria.findtext("cac:TaxScheme/cbc:ID", namespaces=_NS)

        lineas.append(
            {
                "descripcion": item.findtext("cbc:Description", namespaces=_NS) if item is not None else "",
                "cantidad": float(cantidad_elem.text) if cantidad_elem is not None and cantidad_elem.text else 0.0,
                "unidad_medida": cantidad_elem.get("unitCode") if cantidad_elem is not None else None,
                "precio_unitario": float(price.findtext("cbc:PriceAmount", default="0", namespaces=_NS))
                if price is not None
                else 0.0,
                "subtotal_linea": float(linea.findtext("cbc:LineExtensionAmount", default="0", namespaces=_NS)),
                "tributo": tributo,
                "tarifa_impuesto": tarifa_impuesto,
                "impuesto_linea": impuesto_linea,
            }
        )
    return lineas


def extraer_emisor_factura_ubl(xml_bytes: bytes) -> dict | None:
    """Extrae nombre/identificacion del emisor (cac:AccountingSupplierParty)
    de un XML UBL de factura -- usado para sugerir un Proveedor al cargar
    una Compra desde CUFE (Fase 5). None si el XML no trae ese bloque."""
    root = ET.fromstring(xml_bytes)
    supplier = root.find("cac:AccountingSupplierParty/cac:Party", _NS)
    if supplier is None:
        return None

    legal_entity = supplier.find("cac:PartyLegalEntity", _NS)
    if legal_entity is None:
        return None

    company_id_elem = legal_entity.find("cbc:CompanyID", _NS)
    if company_id_elem is None or not company_id_elem.text:
        return None

    return {
        "nombre": legal_entity.findtext("cbc:RegistrationName", namespaces=_NS),
        "tipo_identificacion": company_id_elem.get("schemeName"),
        "numero_identificacion": company_id_elem.text.strip(),
    }
