"""
Script de investigacion Sprint 8 (post-cierre) - resolucion de pruebas real.

Hipotesis (documentacion oficial de Alegra, docs/entornos): para que una
factura de prueba en sandbox quede ACEPTADA (no solo "aceptada por Alegra
pero rechazada por la DIAN"), la empresa asociada de prueba debe crearse con
el NIT/DV publico de ejemplo de Alegra (900559088 / DV 2) -- asi el
technicalKey de ejemplo (ligado a ese NIT) si coincide con el emisor.

Este script crea una empresa asociada NUEVA con ese NIT exacto (en vez de uno
aleatorio), la habilita con un test-set, y envia una factura usando la
resolucion de ejemplo -- si la hipotesis es correcta, legalStatus debe salir
ACCEPTED en vez de REJECTED.

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
SANDBOX_GOVERNMENT_ID = "a70562e0-631e-4ceb-aa65-36887b57dc17"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def call(method: str, path: str, **kwargs):
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
    # 1) Crear empresa asociada con el NIT/DV PUBLICO de ejemplo de Alegra,
    #    no uno aleatorio -- esta es la hipotesis a verificar.
    create_company_payload = {
        "name": "IngeFact Test Resolucion Alegra",
        "tradeName": "IngeFact Test",
        "identification": "900559088",
        "dv": "2",
        "useAlegraCertificate": True,
        "identificationType": "31",
        "email": "sprint8-test-resolucion@ingefact.test",
        "phone": "3000000000",
        "organizationType": 1,
        "regimeCode": "R-99-PN",
        "address": {
            "address": "Calle de prueba 123",
            "department": "11",
            "city": "11001",
            "country": "CO",
        },
    }
    resp_company, company_body = call("POST", "/companies", json=create_company_payload)

    company_id = None
    if resp_company.status_code < 300 and company_body:
        company_id = (company_body.get("company") or {}).get("id") or company_body.get("id")

    if not company_id:
        print("\n\nNo se pudo crear/reusar la empresa con NIT 900559088, abortando.", file=sys.stderr)
        return

    print(f"\n\ncompany_id: {company_id}", file=sys.stderr)

    # 2) Habilitar con test-set
    call(
        "POST",
        "/test-sets",
        json={"type": "invoices", "governmentId": SANDBOX_GOVERNMENT_ID, "company": {"id": company_id}},
    )

    # 3) Enviar factura con la resolucion de ejemplo oficial EXACTA (prefijo,
    #    rango y technicalKey atados a NIT 900559088 -- no se pueden inventar,
    #    la DIAN valida el prefijo/rango contra lo que ya tiene registrado
    #    para ese NIT, visto en el intento anterior con FAB10b/11b/12b).
    numero = random.randint(990000000, 994999999)
    invoice_payload = {
        "documentType": "01",
        "number": numero,
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
            "name": "Cliente de prueba",
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
    call("POST", "/invoices", json=invoice_payload)


if __name__ == "__main__":
    main()
