from types import SimpleNamespace

from src.core.representacion_pdf_common import (
    nombre_regimen_fiscal,
    nombre_responsabilidad_fiscal,
    render_adquiriente_html,
    render_emisor_html,
)

_RESPONSABILIDADES_FISCALES = [
    SimpleNamespace(code="O-13", value="Gran contribuyente"),
    SimpleNamespace(code="R-99-PN", value="No aplica – Otros *"),
]
_TIPOS_ORGANIZACION = [SimpleNamespace(code="1", value="Persona Juridica")]
_TRIBUTOS = [SimpleNamespace(code="01", value="IVA")]
_DEPARTAMENTOS = [SimpleNamespace(code="11", value="Bogota D.C.")]
_MUNICIPIOS = [SimpleNamespace(code="11001", value="Bogota D.C.")]


def _catalogos(**overrides):
    base = {
        "departamentos": _DEPARTAMENTOS,
        "municipios": _MUNICIPIOS,
        "tipos_organizacion": _TIPOS_ORGANIZACION,
        "responsabilidades_fiscales": _RESPONSABILIDADES_FISCALES,
        "tributos": _TRIBUTOS,
    }
    base.update(overrides)
    return base


def test_nombre_responsabilidad_fiscal_oculta_el_generico_no_aplica():
    assert nombre_responsabilidad_fiscal(_RESPONSABILIDADES_FISCALES, "R-99-PN") is None
    assert nombre_responsabilidad_fiscal(_RESPONSABILIDADES_FISCALES, None) is None
    assert nombre_responsabilidad_fiscal(_RESPONSABILIDADES_FISCALES, "O-13") == "Gran contribuyente"


def test_nombre_regimen_fiscal_mapea_48_49():
    assert nombre_regimen_fiscal("48") == "Responsable de IVA"
    assert nombre_regimen_fiscal("49") == "No responsable de IVA"
    assert nombre_regimen_fiscal(None) is None


def test_render_emisor_html_oculta_responsabilidad_fiscal_no_aplica_y_muestra_regimen():
    empresa = SimpleNamespace(
        razon_social="Empresa Demo SAS",
        numero_identificacion="900618467",
        digito_verificacion="4",
        direccion="Calle 1",
        telefono="3000000000",
        correo_electronico="demo@example.com",
        departamento="11",
        municipio="11001",
        tipo_organizacion="1",
        regimen="R-99-PN",
        regimen_fiscal="48",
    )
    html = render_emisor_html(empresa, _catalogos())

    assert "Responsabilidad Fiscal" not in html
    assert "Regimen Fiscal: Responsable de IVA" in html


def test_render_emisor_html_muestra_responsabilidad_fiscal_real():
    empresa = SimpleNamespace(
        razon_social="Empresa Demo SAS",
        numero_identificacion="900618467",
        digito_verificacion="4",
        direccion=None,
        telefono=None,
        correo_electronico=None,
        departamento=None,
        municipio=None,
        tipo_organizacion=None,
        regimen="O-13",
        regimen_fiscal=None,
    )
    html = render_emisor_html(empresa, _catalogos())

    assert "Responsabilidad Fiscal: Gran contribuyente" in html
    assert "Regimen Fiscal" not in html


def test_render_adquiriente_html_oculta_filas_vacias():
    cliente = SimpleNamespace(
        nombre="Cliente Demo",
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        correo_electronico=None,
        telefono=None,
        tipo_organizacion=None,
        regimen="R-99-PN",
        regimen_fiscal=None,
        tributo=None,
    )
    html = render_adquiriente_html(cliente, _catalogos())

    assert "Responsabilidad Fiscal" not in html
    assert "Regimen Fiscal" not in html
    assert "Responsabilidad Tributaria" not in html


def test_render_adquiriente_html_muestra_todo_cuando_hay_datos():
    cliente = SimpleNamespace(
        nombre="Cliente Demo",
        tipo_identificacion="13",
        numero_identificacion="1000000000",
        correo_electronico="cliente@example.com",
        telefono="3000000000",
        tipo_organizacion="1",
        regimen="O-13",
        regimen_fiscal="49",
        tributo="01",
    )
    html = render_adquiriente_html(cliente, _catalogos())

    assert "Responsabilidad Fiscal: Gran contribuyente" in html
    assert "Regimen Fiscal: No responsable de IVA" in html
    assert "Responsabilidad Tributaria: IVA" in html
