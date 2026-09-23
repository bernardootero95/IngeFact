"""Piezas compartidas del envio por correo de documentos electronicos
(Factura, Nota Credito, Nota Debito, Documento Soporte): adjuntos, mapeo de
errores del reenvio manual y el correo de las notas."""

import base64
from typing import Callable

from fastapi import HTTPException, status

from src.core.email_client import EmailClient, EmailSendError
from src.core.email_templates import QR_CONTENT_ID, plantilla_nota_cliente
from src.core.qr_utils import generar_qr_png_base64
from src.core.representacion_pdf_common import formatear_cop
from src.core.tiempo import fecha_documento_colombia
from src.infrastructure.db.models import Empresa


def construir_adjuntos(numero: str, qr_code_content: str | None, pdf_bytes: bytes, xml_bytes: bytes) -> list[dict]:
    """QR embebido (content_id) + PDF de la representacion grafica + XML."""
    return [
        {
            "filename": f"{numero}.png",
            "content": generar_qr_png_base64(qr_code_content or ""),
            "content_id": QR_CONTENT_ID,
        },
        {"filename": f"{numero}.pdf", "content": base64.b64encode(pdf_bytes).decode("ascii")},
        {"filename": f"{numero}.xml", "content": base64.b64encode(xml_bytes).decode("ascii")},
    ]


def ejecutar_envio_reportando_errores(envio: Callable[[], None], mensaje_preparacion: str) -> None:
    """Para el reenvio MANUAL: a diferencia del envio automatico (best-effort),
    un fallo real de Resend/Alegra se reporta al usuario como 502 en vez de
    fallar en silencio."""
    try:
        envio()
    except EmailSendError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No se pudo enviar el correo. Intenta de nuevo.") from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 -- errores inesperados al armar el XML/QR/PDF
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, mensaje_preparacion) from exc


def resolver_destinatario(destinatario: str | None, correo_por_defecto: str | None, quien: str) -> str:
    """El correo pedido por el usuario tiene prioridad; si no hay, el del
    cliente/proveedor del documento. 400 si no hay ninguno."""
    correo = destinatario or correo_por_defecto
    if not correo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{quien} no tiene correo registrado.")
    return correo


def enviar_nota_por_correo(
    servicio,
    nota,
    *,
    tipo: str,
    destinatario: str,
    email_client: EmailClient,
) -> None:
    """Arma y envia el correo de una Nota Credito/Debito aceptada. `servicio`
    es el NotaCreditoService/NotaDebitoService (comparten obtener_url_xml y
    generar_pdf_representacion). Deja propagar cualquier error."""
    url_xml = servicio.obtener_url_xml(nota.empresa_id, nota.id)
    xml_bytes = servicio._alegra_client.fetch_raw(url_xml)
    pdf_bytes = servicio.generar_pdf_representacion(nota.empresa_id, nota.id)

    empresa = servicio.db.get(Empresa, nota.empresa_id)
    fecha_mostrar = fecha_documento_colombia(nota.fecha_envio, nota.fecha)
    subject, html = plantilla_nota_cliente(
        tipo=tipo,
        razon_social_emisor=empresa.razon_social,
        nombre_cliente=nota.cliente.nombre,
        numero_completo=nota.numero_completo or "",
        factura_afectada=nota.factura.numero_completo or "",
        fecha=fecha_mostrar.strftime("%d/%m/%Y"),
        total_formateado=formatear_cop(float(nota.total)),
        cude=nota.cude or "",
    )
    numero = nota.numero_completo or str(nota.id)
    email_client.send(
        to=destinatario,
        subject=subject,
        html=html,
        attachments=construir_adjuntos(numero, nota.qr_code_content, pdf_bytes, xml_bytes),
    )
