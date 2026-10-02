"""Logo de la empresa para las representaciones graficas.

Se guarda en la BD (bytes + mime) en vez de un bucket: es un archivo pequeno,
uno por empresa, y asi el PDF lo embebe como `data:` sin ninguna descarga
(render_pdf solo permite ese esquema, ver pdf_render.py). Solo PNG/JPEG: SVG
queda fuera porque puede traer scripts o referencias externas.
"""

import base64
import binascii
import re

MAX_BYTES_LOGO = 300 * 1024

_FIRMAS = {
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/jpeg": b"\xff\xd8\xff",
}
_DATA_URL = re.compile(r"^data:(image/(?:png|jpeg));base64,(.+)$", re.DOTALL)


def decodificar_logo(data_url: str) -> tuple[bytes, str]:
    """`data:image/png;base64,...` -> (bytes, mime). El mime declarado se
    contrasta con la firma real del archivo para no confiar en lo que mande
    el navegador."""
    coincidencia = _DATA_URL.match(data_url.strip())
    if not coincidencia:
        raise ValueError("El logo debe ser una imagen PNG o JPG.")
    mime, contenido = coincidencia.groups()
    try:
        datos = base64.b64decode(contenido, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("La imagen del logo no es valida.") from exc
    if not datos.startswith(_FIRMAS[mime]):
        raise ValueError("El archivo no es una imagen PNG o JPG valida.")
    if len(datos) > MAX_BYTES_LOGO:
        raise ValueError(f"El logo no puede pesar mas de {MAX_BYTES_LOGO // 1024} KB.")
    return datos, mime


def logo_data_url(empresa) -> str | None:
    if not empresa.logo or not empresa.logo_mime:
        return None
    return f"data:{empresa.logo_mime};base64,{base64.b64encode(empresa.logo).decode('ascii')}"


def render_logo_html(empresa) -> str:
    """<img> del logo si la empresa lo tiene y eligio mostrarlo en sus
    documentos. Recibe el modelo real (no la vista escapada): son bytes."""
    if not empresa or not empresa.mostrar_logo:
        return ""
    url = logo_data_url(empresa)
    return f'<img class="logo" src="{url}" alt="Logo" />' if url else ""
