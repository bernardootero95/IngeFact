"""
Script de investigacion Sprint 9 - Parte 0.

Golpea el sandbox REAL de Alegra (mismo patron que explore_alegra_invoice_detail.py
de Sprint 8) para crear una Nota Credito real referenciando una factura ya
ACEPTADA en el sandbox (SETP991453316, empresa de pruebas del tenant local).

Objetivo: confirmar contra el sandbox real si POST /credit-notes exige un
bloque "resolution" propio (como /invoices) o si Alegra resuelve la
numeracion de la nota a partir de la resolucion ya registrada de la factura
asociada -- pregunta abierta documentada en docs/alegra-investigacion.md.

No es parte de la aplicacion FastAPI, es una herramienta de investigacion de
un solo uso.
"""

import json
import random
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

# Factura real ya ACEPTADA en el sandbox (ver memoria Sprint 8 / seed_working_test_resolution.py)
FACTURA_ORIGINAL = {
    "date": "2026-09-02",
    "documentType": "01",
    "number": 991453316,
    "prefix": "SETP",
    "uuid": "af70730c75d9086635cc86db4a5465c4365734c186277969bdfb1c6f39556d110c7775254949ddb6636d3733f03f7ce8",
}


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
    # Empresa asociada real que emitio la factura de referencia (NIT 900559088,
    # ver memoria Sprint 8 / seed_working_test_resolution.py) -- no la empresa
    # principal del token. Primer intento uso /company (principal) y la DIAN
    # rechazo con "NIT no autorizado a enviar documentos para emisor", mismo
    # patron ya conocido desde Sprint 0: la nota debe salir de la MISMA empresa
    # (mismo NIT) que emitio la factura referenciada.
    company_id = "01M1ESGJ04WNQT8MAW9NVV6Z67"

    # Intento 1: SIN bloque "resolution" (igual al ejemplo de la doc/postman)
    credit_note_payload = {
        "number": random.randint(1, 999999),
        "conceptCode": "2",  # "Anulacion del documento equivalente electronico" -- catalogo real ya sincronizado
        "company": {"id": company_id},
        "customer": {
            "name": "Cliente de prueba Sprint 9",
            "identificationType": "13",
            "identificationNumber": "1000000000",
        },
        "associatedDocuments": [FACTURA_ORIGINAL],
        "invoicePeriod": {"startDate": "2026-09-02", "endDate": "2026-09-02"},
        "items": [
            {
                "description": "Producto de prueba",
                "price": 100000,
                "quantity": 1,
                "unitCode": "94",
                "subtotal": 100000,
                "taxAmount": 19000,
                "taxes": [
                    {"taxCode": "01", "taxAmount": 19000, "taxPercentage": "19", "taxableAmount": 100000}
                ],
            }
        ],
        "totalAmounts": {
            "grossTotal": 100000,
            "taxableTotal": 100000,
            "taxTotal": 19000,
            "discountTotal": 0,
            "chargeTotal": 0,
            "advanceTotal": 0,
            "payableTotal": 119000,
            "currencyCode": "COP",
        },
        "payments": [{"paymentForm": "1", "paymentMethod": "10", "amount": 119000}],
    }

    print("\n\n########## Intento 1: POST /credit-notes SIN resolution ##########", file=sys.stderr)
    resp1, body1 = call("POST", "/credit-notes", json=credit_note_payload)

    if resp1.status_code >= 300:
        print("\n\n########## Intento 2: POST /credit-notes CON resolution (misma de la factura) ##########", file=sys.stderr)
        credit_note_payload_v2 = dict(credit_note_payload)
        credit_note_payload_v2["prefix"] = "SETP"
        credit_note_payload_v2["resolution"] = {
            "resolutionNumber": "18760000001",
            "prefix": "SETP",
            "minNumber": 990000000,
            "maxNumber": 995000000,
            "startDate": "2019-01-19",
            "endDate": "2030-01-19",
            "technicalKey": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        }
        call("POST", "/credit-notes", json=credit_note_payload_v2)


if __name__ == "__main__":
    main()
