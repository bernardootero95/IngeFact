from datetime import datetime, timezone

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


def verificar_contra_alegra(
    crudas: list[dict],
    *,
    numero_resolucion: str,
    prefijo: str,
    rango_minimo: int,
    rango_maximo: int,
    technical_key: str | None = None,
) -> str | None:
    """Compara la resolucion guardada contra los rangos que la DIAN tiene
    para el NIT. Devuelve None si coincide, o el motivo en lenguaje del
    tenant si no. Antes "Validar" solo comprobaba que Alegra respondiera,
    sin mirar los datos -- una resolucion mal digitada quedaba "validada".

    Un mismo numero de resolucion puede autorizar varios rangos (prefijos
    distintos), asi que se busca el rango exacto entre todos los que tengan
    ese numero. `prefix` es opcional en Alegra: solo se compara si viene.
    `technical_key` solo aplica a facturacion (documento soporte no lo usa)."""
    mismo_numero = [r for r in crudas if str(r.get("resolutionNumber", "")).strip() == numero_resolucion.strip()]
    if not mismo_numero:
        return f"La resolucion {numero_resolucion} no esta registrada ante la DIAN para tu NIT."

    mismo_rango = [r for r in mismo_numero if r.get("minNumber") == rango_minimo and r.get("maxNumber") == rango_maximo]
    if not mismo_rango:
        registrados = ", ".join(f"{r.get('minNumber')}-{r.get('maxNumber')}" for r in mismo_numero)
        return (
            f"El rango guardado ({rango_minimo}-{rango_maximo}) no coincide con el registrado "
            f"ante la DIAN para la resolucion {numero_resolucion} ({registrados})."
        )

    r = mismo_rango[0]
    prefijo_dian = (r.get("prefix") or "").strip()
    if prefijo_dian and prefijo_dian.upper() != prefijo.strip().upper():
        return f"El prefijo guardado ({prefijo}) no coincide con el registrado ante la DIAN ({prefijo_dian})."

    if technical_key is not None and (r.get("technicalKey") or "").strip() != technical_key.strip():
        return "La clave tecnica guardada no coincide con la registrada ante la DIAN para esta resolucion."

    return None


def validar_resolucion_ante_alegra(resolucion, alegra_client: AlegraClient, nit: str, *, con_technical_key: bool) -> None:
    """Actualiza estado_validacion/mensaje_validacion/fecha_ultima_validacion
    de `resolucion` (ResolucionDian o ResolucionDocumentoSoporte) -- no hace
    commit. Un timeout/5xx de Alegra no dice nada de la resolucion, asi que
    responde 502 sin tocar el estado (no degrada una resolucion ya validada
    por una caida de Alegra)."""
    try:
        crudas = alegra_client.get_resolution(nit).get("resolutions") or []
    except AlegraApiError as exc:
        motivo = map_alegra_error(exc.status_code, exc.body)
    except AlegraTransientError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Alegra no respondio a tiempo. Intenta de nuevo en unos minutos.",
        ) from exc
    else:
        motivo = verificar_contra_alegra(
            crudas,
            numero_resolucion=resolucion.numero_resolucion,
            prefijo=resolucion.prefijo,
            rango_minimo=resolucion.rango_minimo,
            rango_maximo=resolucion.rango_maximo,
            technical_key=resolucion.technical_key if con_technical_key else None,
        )

    resolucion.estado_validacion = "error" if motivo else "validada"
    resolucion.mensaje_validacion = motivo
    resolucion.fecha_ultima_validacion = datetime.now(timezone.utc)
