from fastapi import HTTPException, status

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError
from src.core.alegra_errors import map_alegra_error

SIN_RESOLUCIONES = (
    "No encontramos resoluciones DIAN registradas para tu empresa. Revisa que la hayas tramitado ante la DIAN."
)


def consultar_resoluciones_alegra(alegra_client: AlegraClient, nit: str) -> list[dict]:
    """GET /resolutions/{nit} (solo produccion) -- devuelve el arreglo crudo
    de rangos que la DIAN tiene para el NIT, de todos los tipos de documento
    (facturacion y documento soporte vienen mezclados). Cada servicio filtra
    y mapea los que le sirven.

    Los errores de Alegra se traducen a HTTPException: sin el except de
    AlegraTransientError el error llegaba como 500 sin cabeceras CORS y el
    navegador lo reportaba como bloqueo de CORS (bug 2026-09-28)."""
    try:
        data = alegra_client.get_resolution(nit)
    except AlegraApiError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body)) from exc
    except AlegraTransientError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Alegra no respondio a tiempo. Intenta de nuevo en unos minutos.",
        ) from exc
    return data.get("resolutions") or []
