"""
Script de investigacion Sprint 8 - Parte 0.

Golpea el sandbox REAL de Alegra (mismo patron que explore_alegra.py de
Sprint 0) para crear una factura de prueba contra la empresa principal del
token y luego hacer GET /invoices/{id} inmediatamente despues, buscando si
la respuesta trae un campo de PDF (files.pdf) analogo al files.xml ya
documentado, o algun otro medio de obtener el PDF de la factura.

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


def call(method: str, path: str, **kwargs) -> httpx.Response:
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
    resp_self, self_body = call("GET", "/company")
    if resp_self.status_code >= 300:
        print("No se pudo resolver la empresa principal del token, abortando.", file=sys.stderr)
        return

    company_id = (self_body.get("company") or {}).get("id")
    if not company_id:
        print("Respuesta de /company sin id, abortando.", file=sys.stderr)
        return

    invoice_payload = {
        "documentType": "01",
        "number": random.randint(1, 999999),
        "prefix": "SETP",
        "company": {"id": company_id},
        "resolution": {
            "resolutionNumber": "18760000001",
            "prefix": "SETP",
            "minNumber": 990000000,
            "maxNumber": 995000000,
            "startDate": "2019-01-19",
            "endDate": "2030-01-19",
            "technicalKey": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        },
        "customer": {
            "name": "Cliente de prueba Sprint 8",
            "identificationType": "13",
            "identificationNumber": "1000000000",
        },
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

    resp_invoice, invoice_body = call("POST", "/invoices", json=invoice_payload)
    if resp_invoice.status_code >= 300 or not invoice_body:
        print("No se pudo crear la factura de prueba, abortando.", file=sys.stderr)
        return

    invoice_id = (invoice_body.get("invoice") or {}).get("id") or invoice_body.get("id")
    if not invoice_id:
        print("Respuesta de creacion sin invoice.id, abortando.", file=sys.stderr)
        return

    print(f"\n\ninvoice_id creado: {invoice_id}", file=sys.stderr)

    print("\n\n########## GET /invoices/{id} ##########", file=sys.stderr)
    call("GET", f"/invoices/{invoice_id}")

    print("\n\n########## GET /invoices/{id}/pdf (por si existe endpoint dedicado) ##########", file=sys.stderr)
    call("GET", f"/invoices/{invoice_id}/pdf")


if __name__ == "__main__":
    main()
