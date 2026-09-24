"""
Mapeo de errores de Alegra a mensajes claros para el usuario.

Basado en los hallazgos reales documentados en apps/api/docs/alegra-investigacion.md
(Sprint 0) -- no son suposiciones, son errores que se reprodujeron contra el sandbox.
"""

ERROR_CODE_MAP: dict[str, str] = {
    "AEP9006": "Esta operación solo está disponible en el ambiente de producción.",
}

GOVERNMENT_RESPONSE_CODE_MAP: dict[str, str] = {
    "89": "La resolucion configurada no pertenece al NIT de esta empresa. Verifica la Resolucion DIAN.",
}


def map_alegra_error(status_code: int, body: dict) -> str:
    """Traduce una respuesta de error de Alegra (400/404/etc, no la del webhook) a un mensaje claro."""
    errors = body.get("errors") or []
    for err in errors:
        code = err.get("code")
        if code and code in ERROR_CODE_MAP:
            return ERROR_CODE_MAP[code]

    messages = [err.get("message", "") for err in errors if err.get("message")]
    if messages:
        if any("requires property" in m for m in messages):
            faltantes = ", ".join(messages)
            return f"El proveedor tecnológico rechazó la solicitud por datos faltantes: {faltantes}"
        return "El proveedor tecnológico rechazó la solicitud: " + "; ".join(messages)

    if status_code == 404:
        return "El recurso solicitado no existe."
    if status_code >= 500:
        return "El servicio de facturación electrónica no está respondiendo en este momento. Se reintentará automáticamente."
    return f"El proveedor tecnológico rechazó la solicitud (HTTP {status_code})."


def map_government_response(code: str, message: str) -> str:
    return GOVERNMENT_RESPONSE_CODE_MAP.get(code, message)
