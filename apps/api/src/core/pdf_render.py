"""Render seguro de las representaciones graficas en PDF (WeasyPrint).

Dos defensas, porque el HTML lleva datos que escribe el tenant (nombres de
clientes, descripciones de productos, direcciones, notas...):

1. render_pdf() usa un url_fetcher que solo permite URIs `data:` (el QR va
   embebido asi). Sin esto WeasyPrint descarga cualquier recurso que
   aparezca en el HTML: un `<link rel="attachment" href="file:///...">`
   metido en el nombre de un cliente adjuntaba al PDF archivos del servidor
   (p. ej. el .env con secretos), y un `<img src="http://...">` permitia
   hacer peticiones a la red interna (SSRF).
2. escapado() envuelve los objetos del documento para que todo texto salga
   escapado con html.escape al interpolarlo, sin tener que recordar
   escapar cada campo en cada generador.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from html import escape

_SIN_ESCAPAR = (bool, int, float, Decimal, date, datetime, uuid.UUID)

# Los imports de weasyprint son perezosos (dentro de las funciones): la
# libreria carga libgobject/libpango del sistema apenas se importa, y sin
# ellas (Windows sin GTK3) romperia cualquier import de los servicios que
# generan PDF. En Docker (el Dockerfile las instala) importa sin problema.


# Unico esquema que WeasyPrint puede cargar: el QR va embebido como data:.
# file://, http(s)://, ftp:// etc. se rechazan (WeasyPrint omite el recurso
# y sigue renderizando). Verificado con WeasyPrint real en Docker:
# scripts/verificar_pdf_seguro.py.
PROTOCOLOS_PERMITIDOS = frozenset({"data"})


def render_pdf(html: str) -> bytes:
    from weasyprint import HTML
    from weasyprint.urls import URLFetcher

    fetcher = URLFetcher(allowed_protocols=PROTOCOLOS_PERMITIDOS, allow_redirects=False)
    return HTML(string=html, url_fetcher=fetcher).write_pdf()


def escapar_valor(valor):
    """Escapa recursivamente: str -> html.escape, dict/list -> sus elementos
    (claves incluidas: los JSONB de nomina vienen del cliente), objetos ->
    vista escapada. Numeros, fechas, UUID y None pasan tal cual."""
    if valor is None or isinstance(valor, _SIN_ESCAPAR):
        return valor
    if isinstance(valor, str):
        return escape(valor, quote=True)
    if isinstance(valor, dict):
        return {escapar_valor(k): escapar_valor(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [escapar_valor(v) for v in valor]
    return _VistaEscapada(valor)


class _VistaEscapada:
    """Proxy de solo lectura sobre un modelo: cada atributo se devuelve
    escapado. No se usa para escribir ni para pasarlo a la sesion de BD."""

    __slots__ = ("_obj",)

    def __init__(self, obj):
        object.__setattr__(self, "_obj", obj)

    def __getattr__(self, nombre):
        return escapar_valor(getattr(self._obj, nombre))

    def __setattr__(self, nombre, valor):
        raise AttributeError("Vista escapada de solo lectura.")

    def __bool__(self):
        return bool(self._obj)


def escapado(obj):
    """Vista escapada de `obj` (None se devuelve tal cual)."""
    return escapar_valor(obj)
