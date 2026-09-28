"""Regla unica para trasladar el legalStatus que devuelve la DIAN (via
Alegra) a cualquier documento electronico: Factura, Nota Credito, Nota
Debito, Nomina y Documento Soporte.

La usan los tres caminos por los que un documento sale de 'enviada': la
respuesta sincrona de enviar(), el webhook emissionFinished y la
reconciliacion (ver reconciliacion_documentos.py) -- asi no pueden decidir
distinto sobre el mismo documento."""

from datetime import datetime, timezone

from src.core.alegra_errors import map_government_response

# ACCEPTED_WITH_OBSERVATIONS = la DIAN acepto el documento con notificaciones
# no bloqueantes (ej. reglas FAZ09/FAJ43b) -- es una aceptacion real, no un
# estado intermedio ni un rechazo.
ESTADOS_LEGALES_ACEPTADO = ("ACCEPTED", "ACCEPTED_WITH_OBSERVATIONS")


def aplicar_estado_legal(
    documento,
    datos: dict,
    *,
    campo_codigo: str,
    mensaje_rechazo: str,
    estado_aceptado: str = "aceptada",
    estado_rechazado: str = "rechazada",
) -> bool:
    """`datos` es el objeto del documento en la respuesta de Alegra
    (`invoice`, `creditNote`, `payroll`...). `campo_codigo` es el nombre del
    codigo unico, igual en Alegra y en el modelo (cufe/cude/cune/cuds).
    Documento Soporte usa los estados en masculino ("aceptado").

    Devuelve False sin tocar nada si la DIAN todavia no resolvio."""
    government_response = datos.get("governmentResponse") or {}
    legal_status = datos.get("legalStatus")
    if legal_status in ESTADOS_LEGALES_ACEPTADO:
        documento.estado = estado_aceptado
        # Limpia el rechazo de un intento anterior si este reenvio si fue aceptado.
        documento.razon_rechazo = None
    elif legal_status == "REJECTED":
        documento.estado = estado_rechazado
        documento.razon_rechazo = map_government_response(
            government_response.get("code", ""), government_response.get("message") or mensaje_rechazo
        )
    else:
        return False

    # Si la DIAN tardo en responder, el envio original pudo llegar sin codigo/QR.
    setattr(documento, campo_codigo, datos.get(campo_codigo) or getattr(documento, campo_codigo))
    documento.qr_code_content = datos.get("qrCodeContent") or documento.qr_code_content
    # errorMessages trae el detalle completo (notificaciones no bloqueantes o
    # las reglas violadas) -- se guarda crudo, no solo el mensaje ya mapeado.
    documento.notificaciones_dian = government_response.get("errorMessages") or None
    documento.fecha_respuesta = datetime.now(timezone.utc)
    return True
