"""Verificacion manual (requiere WeasyPrint con GTK, p. ej. dentro del
contenedor Docker de la API): el render seguro debe incluir el QR embebido
como data: y NO adjuntar ni cargar recursos file:// o http://.

    docker compose run --rm api python scripts/verificar_pdf_seguro.py
"""

from src.core.pdf_render import escapado, render_pdf
from src.core.qr_utils import generar_qr_png_base64

qr = generar_qr_png_base64("https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=abc&x=1")
malicioso = '<link rel="attachment" href="file:///etc/passwd"><img src="http://169.254.169.254/">'

sin_escapar = f'<html><body>{malicioso}<img src="data:image/png;base64,{qr}" /></body></html>'
pdf = render_pdf(sin_escapar)
assert b"/EmbeddedFile" not in pdf, "Se adjunto un archivo del servidor al PDF"
assert b"root:x:0:0" not in pdf, "El contenido de /etc/passwd quedo dentro del PDF"
assert b"/Subtype /Image" in pdf or b"/Subtype/Image" in pdf, "El QR data: no se renderizo"
print("OK: sin escapar, el url_fetcher bloquea file:// y http:// y el QR data: se renderiza")

nombre = escapado(type("C", (), {"nombre": malicioso})()).nombre
pdf = render_pdf(f"<html><body><p>{nombre}</p></body></html>")
assert b"/EmbeddedFile" not in pdf
print("OK: escapado, el nombre se imprime como texto")
