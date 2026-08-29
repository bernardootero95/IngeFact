"""
Script de investigacion Sprint 0 - Parte B.

Golpea el sandbox REAL de Alegra (con el token ya configurado en apps/api/.env)
para capturar requests/responses reales: crear compania, crear test set,
consultar resoluciones, intentar crear una factura. Todo lo que devuelve se
imprime como JSON y se redirige a un archivo de log para documentarlo despues
en docs/alegra-investigacion.md.

No es parte de la aplicacion FastAPI, es una herramienta de investigacion de
un solo uso (no se importa desde src/, pero reusa src/core/nit.py para el DV).
"""

import json
import random
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
import os

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.core.nit import nit_check_digit  # noqa: E402

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.environ["ALEGRA_BASE_URL"]
TOKEN = os.environ["ALEGRA_TOKEN"]
SANDBOX_GOVERNMENT_ID = "a70562e0-631e-4ceb-aa65-36887b57dc17"

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
    return resp


def main():
    nit = str(random.randint(900000000, 900999999))
    dv = nit_check_digit(nit)

    # 1) Crear compania de prueba
    create_company_payload = {
        "name": f"IngeFact Sprint0 Test {nit}",
        "tradeName": "IngeFact Sprint0 Test",
        "identification": nit,
        "dv": dv,
        "useAlegraCertificate": True,
        "identificationType": "31",
        "email": "sprint0-test@ingefact.test",
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
    resp_company = call("POST", "/companies", json=create_company_payload)

    company_id = None
    if resp_company.status_code < 300:
        data = resp_company.json()
        # La doc dice {"id": ...}, la Edge Function existente asume {"company": {"id": ...}}
        # -- este script confirma empiricamente cual es real.
        company_id = data.get("id") or (data.get("company") or {}).get("id")

    # 2) Crear test set (solo si la compania se creo)
    if company_id:
        call(
            "POST",
            "/test-sets",
            json={
                "type": "invoices",
                "governmentId": SANDBOX_GOVERNMENT_ID,
                "company": {"id": company_id},
            },
        )

    # 3) Consultar resoluciones de la compania de prueba
    call("GET", f"/resolutions/{nit}")

    # 4) Intentar crear una factura minima (se espera error, es lo interesante:
    #    documentar la forma exacta del error de Alegra cuando faltan datos)
    call(
        "POST",
        "/invoices",
        json={
            "documentType": "01",
            "number": 1,
            "company": {"id": company_id or "UNKNOWN"},
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
                }
            ],
            "totalAmounts": {
                "grossTotal": 100000,
                "taxableTotal": 100000,
                "taxTotal": 19000,
                "payableTotal": 119000,
                "currencyCode": "COP",
            },
            "payments": [],
        },
    )

    print(f"\n\nNIT de prueba usado: {nit} (dv={dv})", file=sys.stderr)
    print(f"company_id detectado: {company_id}", file=sys.stderr)

    # 5) Empresa principal asociada al token (la que "es dueña" del token, no una
    #    asociada creada por nosotros) - puede tener resolucion de pruebas propia.
    print("\n\n########## EMPRESA PRINCIPAL DEL TOKEN (GET /company) ##########", file=sys.stderr)
    resp_self = call("GET", "/company")
    self_nit = None
    fixed_company_id = None
    if resp_self.status_code < 300:
        self_company = resp_self.json().get("company") or {}
        fixed_company_id = self_company.get("id")
        self_nit = self_company.get("identification")

    if self_nit:
        call("GET", f"/resolutions/{self_nit}")

    if fixed_company_id:
        call(
            "POST",
            "/invoices",
            json={
                "documentType": "01",
                "number": random.randint(1, 999999),
                "prefix": "SETP",
                "company": {"id": fixed_company_id},
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
                            {
                                "taxCode": "01",
                                "taxAmount": 19000,
                                "taxPercentage": "19",
                                "taxableAmount": 100000,
                            }
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
            },
        )
    else:
        print("No se encontro la empresa fija 900559088 con este token.", file=sys.stderr)


if __name__ == "__main__":
    main()
