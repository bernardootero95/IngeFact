from pathlib import Path

from src.core.xml_utils import extraer_emisor_factura_ubl, extraer_lineas_factura_ubl

FIXTURE = (Path(__file__).parent / "fixtures" / "factura_ubl_sample.xml").read_bytes()


def test_extraer_lineas_factura_ubl_devuelve_los_datos_reales_de_la_linea():
    lineas = extraer_lineas_factura_ubl(FIXTURE)

    assert len(lineas) == 1
    linea = lineas[0]
    assert linea["descripcion"] == "Servicio de Consultoria Sprint 8"
    assert linea["cantidad"] == 1.0
    assert linea["unidad_medida"] == "94"
    assert linea["precio_unitario"] == 100000.0
    assert linea["subtotal_linea"] == 100000.0
    assert linea["tributo"] == "01"
    assert linea["tarifa_impuesto"] == 19.0
    assert linea["impuesto_linea"] == 19000.0


def test_extraer_lineas_factura_ubl_sin_lineas_devuelve_lista_vacia():
    xml_sin_lineas = b"""<Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
        xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"></Invoice>"""

    assert extraer_lineas_factura_ubl(xml_sin_lineas) == []


def test_extraer_emisor_factura_ubl_devuelve_nombre_y_nit_reales():
    emisor = extraer_emisor_factura_ubl(FIXTURE)

    assert emisor is not None
    assert emisor["nombre"] == "IngeFact Dev - Resolucion de pruebas"
    assert emisor["tipo_identificacion"] == "31"
    assert emisor["numero_identificacion"] == "900559088"


def test_extraer_emisor_factura_ubl_sin_supplier_devuelve_none():
    xml_sin_emisor = b"""<Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
        xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"></Invoice>"""

    assert extraer_emisor_factura_ubl(xml_sin_emisor) is None
