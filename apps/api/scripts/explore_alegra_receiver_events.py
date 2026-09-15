"""
Script de investigacion Fase 4 (Eventos del Receptor / "Aceptacion de Facturas").

Golpea el sandbox REAL de Alegra (mismo patron que explore_alegra_credit_note.py)
para registrar un evento (acuse de recibo, tipo 030) sobre una factura real ya
ACEPTADA en el sandbox, via POST /events/from-cufe.

Objetivo: confirmar contra el sandbox real (la doc oficial dice que basta el
CUFE, sin necesidad de pre-registrar la factura recibida -- ver hallazgo
documentado en docs/alegra-investigacion.md) y ademas:
1. Si Alegra valida que la empresa que llama sea realmente la receptora
   (customer) de esa factura, o si acepta el evento igual.
2. La forma real de la respuesta (legalStatus, cude, type.code con o sin
   cero a la izquierda -- la doc no es consistente en esto).
3. Que pasa si se intenta un tipo de evento invalido o repetido.

No es parte de la aplicacion FastAPI, es una herramienta de investigacion de
un solo uso.
"""

import json
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.environ["ALEGRA_BASE_URL"]
TOKEN = os.environ["ALEGRA_TOKEN"]

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# Factura real ya ACEPTADA en el sandbox, emitida por la empresa asociada del
# tenant local (NIT 900559088) -- ver seed_working_test_resolution.py. Esta
# empresa es la EMISORA de esta factura, no la receptora -- justamente lo que
# queremos probar es si Alegra bloquea el evento por eso o no.
CUFE_FACTURA_REAL = "fbb3f044df273f942a4a5b95324f06d6ab5326618ac9aaef9320d990cb38c72375b0e164f6930299dd486dac039f1937"


def call(method: str, path: str, **kwargs) -> tuple[httpx.Response, dict | None]:
    url = f"{BASE_URL}{path}"
    print(f"\n{'=' * 80}\n{method} {url}", file=sys.stderr)
    if "json" in kwargs:
        print(json.dumps(kwargs["json"], indent=2, ensure_ascii=False), file=sys.stderr)
    resp = httpx.request(method, url, headers=HEADERS, timeout=30, **kwargs)
    print(f"--> {resp.status_code}", file=sys.stderr)
    try:
        body = resp.json()
        print(json.dumps(body, indent=2, ensure_ascii=False), file=sys.stderr)
    except ValueError:
        body = resp.text
        print(body, file=sys.stderr)
    return resp, (body if isinstance(body, dict) else None)


def main():
    print("\n\n########## Intento 1: POST /events/from-cufe tipo 030 (Acuse) ##########", file=sys.stderr)
    payload_acuse = {
        "type": "030",
        "number": "TESTREC001",
        "uuid": CUFE_FACTURA_REAL,
        "issuerParty": {
            "identificationType": "13",
            "identificationNumber": "1000000000",
            "firstName": "Tester",
            "familyName": "Receptor",
        },
    }
    call("POST", "/events/from-cufe", json=payload_acuse)

    print("\n\n########## Intento 2: GET /invoices, buscando parametros de rol/receptor ##########", file=sys.stderr)
    call("GET", "/invoices?limit=1")

    print("\n\n########## Intento 3: POST /events/from-cufe tipo 034 (Aceptacion tacita) ##########", file=sys.stderr)
    payload_aceptacion_tacita = {
        "type": "034",
        "number": "TESTREC002",
        "uuid": CUFE_FACTURA_REAL,
    }
    call("POST", "/events/from-cufe", json=payload_aceptacion_tacita)

    print("\n\n########## Intento 4: repetir el mismo evento 030 (mismo number) ##########", file=sys.stderr)
    call("POST", "/events/from-cufe", json=payload_acuse)


if __name__ == "__main__":
    main()
