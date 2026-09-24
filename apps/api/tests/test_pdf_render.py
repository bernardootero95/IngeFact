"""Defensas del render de PDF frente a datos del tenant (pdf_render.py)."""

import uuid
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest

from src.core.pdf_render import PROTOCOLOS_PERMITIDOS, escapado


def test_escapado_escapa_textos_y_deja_pasar_numeros_fechas_e_ids():
    empresa_id = uuid.uuid4()
    cliente = SimpleNamespace(
        nombre='<link rel="attachment" href="file:///etc/passwd">',
        total=Decimal("10.50"),
        fecha=date(2026, 9, 24),
        empresa_id=empresa_id,
        telefono=None,
    )

    vista = escapado(cliente)

    assert vista.nombre == "&lt;link rel=&quot;attachment&quot; href=&quot;file:///etc/passwd&quot;&gt;"
    assert vista.total == Decimal("10.50")
    assert vista.fecha == date(2026, 9, 24)
    assert vista.empresa_id == empresa_id
    assert vista.telefono is None


def test_escapado_recorre_relaciones_listas_y_dicts_incluidas_las_claves():
    factura = SimpleNamespace(
        cliente=SimpleNamespace(nombre="<b>x</b>"),
        lineas=[SimpleNamespace(descripcion="<i>y</i>", cantidad=2)],
        devengados={"<script>": {"Pago": 100, "Nota": "<u>z</u>"}},
    )

    vista = escapado(factura)

    assert vista.cliente.nombre == "&lt;b&gt;x&lt;/b&gt;"
    assert vista.lineas[0].descripcion == "&lt;i&gt;y&lt;/i&gt;"
    assert vista.lineas[0].cantidad == 2
    assert vista.devengados == {"&lt;script&gt;": {"Pago": 100, "Nota": "&lt;u&gt;z&lt;/u&gt;"}}


def test_escapado_de_none_es_none():
    assert escapado(None) is None


def test_la_vista_escapada_es_de_solo_lectura():
    vista = escapado(SimpleNamespace(nombre="x"))

    with pytest.raises(AttributeError):
        vista.nombre = "y"


def test_el_render_solo_permite_recursos_data():
    # El bloqueo real lo hace weasyprint.urls.URLFetcher(allowed_protocols=...);
    # aca se fija que la lista blanca no se amplie por accidente. La prueba
    # con WeasyPrint real (requiere GTK) esta en scripts/verificar_pdf_seguro.py.
    assert PROTOCOLOS_PERMITIDOS == frozenset({"data"})
