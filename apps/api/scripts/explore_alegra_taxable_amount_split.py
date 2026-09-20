"""
Script de investigacion -- rama feature/icl-ibua-base-gravable-alegra.

Golpea el sandbox REAL de Alegra (mismo patron que explore_alegra_invoice_detail.py)
para confirmar si /invoices acepta, en una MISMA linea, que taxes[].taxableAmount
sea menor que item.subtotal.

Caso de negocio: un distribuidor de cerveza/gaseosa revende un producto que ya
trae ICL/IBUA pagado en la compra (impuesto monofasico, el distribuidor NO es
responsable de declararlo). Al revender no factura ICL/IBUA como tributo propio,
pero la ley excluye ese valor de la base gravable del IVA. Ejemplo:

  Precio total al cliente:        60.000
  ICL ya pagado (no se factura):   9.000  -> queda embebido en el precio
  Base gravable IVA:              42.857  (60.000 - 9.000) / 1.19
  IVA (19% de 42.857):             8.143
  subtotal de la linea (price):   51.857  (base + ICL embebido, SIN IVA)
  total linea:                    51.857 + 8.143 = 60.000

Pregunta abierta: ¿la DIAN (via Alegra) rechaza una linea donde
taxes[].taxableAmount (42.857) != item.subtotal (51.857)?

No es parte de la aplicacion FastAPI, es una herramienta de investigacion de
un solo uso. No corre contra produccion (usa ALEGRA_BASE_URL/TOKEN del sandbox
en apps/api/.env).
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

# Resolucion de pruebas real que la DIAN SI acepta en sandbox (ver
# scripts/seed_working_test_resolution.py / docs/alegra-investigacion.md).
RESOLUTION = {
    "resolutionNumber": "18760000001",
    "prefix": "SETP",
    "minNumber": 990000000,
    "maxNumber": 995000000,
    "startDate": "2019-01-19",
    "endDate": "2030-01-19",
    "technicalKey": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
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
    # Empresa asociada real con NIT 900559088 (duena de la resolucion SETP de
    # pruebas), no la empresa principal del token -- mismo hallazgo que
    # explore_alegra_credit_note.py: la DIAN rechaza si el NIT del emisor no
    # coincide con el de la resolucion.
    company_id = "01M1ESGJ04WNQT8MAW9NVV6Z67"

    base_gravable = round(51000 / 1.19, 2)  # (60000 - 9000) / 1.19 = 42857.14
    subtotal_linea = round(base_gravable + 9000, 2)  # base + ICL embebido = 51857.14
    iva = round(base_gravable * 0.19, 2)  # 8142.86
    total = round(subtotal_linea + iva, 2)  # 60000.00

    invoice_payload = {
        "documentType": "01",
        "number": random.randint(RESOLUTION["minNumber"], RESOLUTION["maxNumber"]),
        "prefix": RESOLUTION["prefix"],
        "company": {"id": company_id},
        "resolution": RESOLUTION,
        "customer": {
            "name": "Cliente de prueba ICL/IBUA",
            "identificationType": "13",
            "identificationNumber": "1000000000",
        },
        "items": [
            {
                "description": "Cerveza 750cc -- ICL ya pagado por el productor, excluido de base IVA",
                "price": subtotal_linea,
                "quantity": 1,
                "unitCode": "94",
                "subtotal": subtotal_linea,
                "taxAmount": iva,
                "taxes": [
                    {
                        "taxCode": "01",
                        "taxAmount": iva,
                        "taxPercentage": "19",
                        "taxableAmount": base_gravable,
                    }
                ],
            }
        ],
        "totalAmounts": {
            "grossTotal": subtotal_linea,
            "taxableTotal": base_gravable,
            "taxTotal": iva,
            "discountTotal": 0,
            "chargeTotal": 0,
            "advanceTotal": 0,
            "payableTotal": total,
            "currencyCode": "COP",
        },
        "payments": [{"paymentForm": "1", "paymentMethod": "10", "amount": total}],
    }

    print(
        f"\nValores calculados: base_gravable={base_gravable} subtotal_linea={subtotal_linea} "
        f"iva={iva} total={total}",
        file=sys.stderr,
    )

    resp_invoice, invoice_body = call("POST", "/invoices", json=invoice_payload)
    if not invoice_body:
        print("Sin body en la respuesta, abortando.", file=sys.stderr)
        return

    invoice = invoice_body.get("invoice") or invoice_body
    legal_status = invoice.get("legalStatus")
    errors = invoice.get("errors") or invoice_body.get("errors")
    print(f"\n\n########## RESULTADO ##########", file=sys.stderr)
    print(f"HTTP status: {resp_invoice.status_code}", file=sys.stderr)
    print(f"legalStatus: {legal_status}", file=sys.stderr)
    if errors:
        print(f"errors: {json.dumps(errors, indent=2, ensure_ascii=False)}", file=sys.stderr)


if __name__ == "__main__":
    main()
