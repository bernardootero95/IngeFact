import base64
from io import BytesIO

import qrcode


def generar_qr_png_base64(contenido: str) -> str:
    """Genera un QR PNG a partir del texto que Alegra ya calcula
    (`qr_code_content`, segun el anexo tecnico de la DIAN) y lo devuelve en
    base64 -- para incrustarlo directo en un <img src="data:image/png;base64,...">
    de un correo, sin depender de un archivo o URL externa."""
    img = qrcode.make(contenido)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")
