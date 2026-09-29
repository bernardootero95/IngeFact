from datetime import date
from xml.sax.saxutils import escape

import pytest

from src.core.factura_ubl_parser import FacturaUblInvalida, parsear_factura_ubl
from tests.test_factura_recibida_service import NIT_EMPRESA, NIT_PROVEEDOR, _xml_factura


def test_lee_los_datos_del_resumen():
    resumen = parsear_factura_ubl(_xml_factura())

    assert resumen.numero == "FEV123"
    assert resumen.prefijo == "FEV"
    assert resumen.fecha == date(2026, 9, 1)
    assert resumen.fecha_vencimiento == date(2026, 10, 1)
    assert resumen.forma_pago == "2"
    assert resumen.proveedor_nombre == "Distribuidora Andina SAS"
    assert resumen.proveedor_nit == NIT_PROVEEDOR
    assert resumen.adquiriente_nit == NIT_EMPRESA
    assert resumen.total == 119000.0


def test_lee_la_factura_dentro_de_un_attached_document():
    attached = f"""<AttachedDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2"
      xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
      xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
      <cac:Attachment><cac:ExternalReference>
        <cbc:Description>{escape(_xml_factura(forma_pago="1"))}</cbc:Description>
      </cac:ExternalReference></cac:Attachment>
    </AttachedDocument>"""

    resumen = parsear_factura_ubl(attached)

    assert resumen.numero == "FEV123"
    assert resumen.forma_pago == "1"


def test_documento_que_no_es_factura_falla():
    with pytest.raises(FacturaUblInvalida):
        parsear_factura_ubl('<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"/>')


def test_xml_corrupto_falla():
    with pytest.raises(FacturaUblInvalida):
        parsear_factura_ubl("<Invoice")
