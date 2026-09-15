"""
Script de investigacion Fase 3 (Documento Soporte de Adquisiciones).

Golpea el sandbox REAL de Alegra (mismo patron que explore_alegra_credit_note.py)
contra POST /support-documents, usando la empresa asociada real del tenant
local (NIT 900559088, ver seed_working_test_resolution.py).

Objetivo: confirmar contra el sandbox real lo que dice la doc oficial
(https://e-provider-docs.alegra.com/reference/createsupportdocument):
1. Si de verdad exige un bloque "resolution" propio (distinto al de
   facturas) -- la doc lo marca requerido pero, a diferencia del de
   facturas, sin "technicalKey".
2. Si el "supplier" (proveedor) se manda inline sin pre-registro, igual que
   "customer" en facturas.
3. Que error real da sin tener una resolucion de Documento Soporte
   registrada para este NIT en el sandbox (se espera rechazo, pero el
   mensaje/codigo importa para saber si el resto del payload esta bien
   formado).

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

# Empresa asociada real (NIT 900559088) -- mismo id ya usado en
# explore_alegra_credit_note.py.
COMPANY_ID = "01M1ESGJ04WNQT8MAW9NVV6Z67"


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
    numero = random.randint(1, 999999)
    payload = {
        "number": numero,
        "resolution": {
            "resolutionNumber": "18760000002",
            "prefix": "SEDS",
            "minNumber": 1,
            "maxNumber": 999999,
            "startDate": "2019-01-19",
            "endDate": "2030-01-19",
        },
        # Company completa (no solo {id}) -- el intento 1 con solo {id} dio
        # "instance.company requires property taxCode", asi que aqui se
        # replica el objeto real que devuelve GET /companies para este id
        # (ver hallazgo en docs/alegra-investigacion.md) + un taxCode de
        # prueba (mismo catalogo de tributos "01"=IVA que ya se usa en
        # lineas de factura, a falta de mejor pista de la doc).
        "company": {
            "id": COMPANY_ID,
            "organizationType": 1,
            "identificationType": "31",
            "identificationNumber": "900559088",
            "dv": "2",
            "name": "IngeFact Dev - Resolucion de pruebas",
            "regimeCode": "R-99-PN",
            # El intento previo con taxCode="01" (string) dio "is not of a
            # type(s) object" -- Alegra espera un objeto aqui, no el codigo
            # crudo como en las lineas. Se prueba con la forma mas comun ya
            # vista en otras respuestas de Alegra (code/value).
            "taxCode": {"code": "01", "value": "IVA"},
            "email": "dev-test-resolution@ingefact.dev",
            "address": {"address": "Calle de prueba 123", "city": "11001", "department": "11", "country": "CO"},
        },
        # organizationType=1 (juridica) + identificationType=31 (NIT) en vez
        # de 2+13 -- el intento 1 con organizationType=2 (persona natural) +
        # identificationType=13 (cedula) fallo con "identificationType is
        # not one of enum values: 21,22,31,41,42,47,50" (justo el set de
        # tipos de documento de EXTRANJEROS/NIT, sin cedula) -- hipotesis a
        # confirmar: el schema de "supplier" en este endpoint no acepta
        # cedula en la rama que probamos, hace falta otra ronda para
        # encontrar la combinacion correcta para un proveedor persona
        # natural (el caso de uso tipico real de Documento Soporte).
        "supplier": {
            "name": "Proveedor de prueba Fase 3",
            "origin": "10",
            "organizationType": 1,
            "identificationType": "31",
            "identificationNumber": "900123456",
            "dv": "1",
            "regimeCode": "R-99-PN",
            "address": {"address": "Cra 1 # 2-3", "city": "11001", "department": "11", "country": "CO"},
        },
        "items": [
            {
                # standardCode requerido segun el error del intento 1 -- se
                # usa un codigo UNSPSC generico de prueba (placeholder, sin
                # confirmar si Alegra valida el codigo contra un catalogo
                # real o solo el formato).
                # "id" es el codigo del ESQUEMA de clasificacion (enum real
                # descubierto: 001/010/020/999), no el codigo del producto
                # en si (eso va en identificationId) -- "999" = generico/otros.
                "standardCode": {"identificationId": "999999999", "id": "999"},
                "description": "Producto de prueba",
                "price": 100000,
                "quantity": 1,
                "unitCode": "94",
                "subtotal": 100000,
                "taxAmount": 19000,
                "taxes": [{"taxCode": "01", "taxAmount": 19000, "taxPercentage": "19.00", "taxableAmount": 100000}],
            }
        ],
        "payments": [{"paymentForm": "1", "paymentMethod": "10"}],
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
    }

    print("\n\n########## Intento 1: company completa + supplier juridica (NIT) + standardCode ##########", file=sys.stderr)
    resp1, body1 = call("POST", "/support-documents", json=payload)

    if resp1.status_code >= 300:
        print(
            "\n\n########## Intento 2: mismo payload, supplier persona natural con cedula (13) ##########",
            file=sys.stderr,
        )
        payload_v2 = json.loads(json.dumps(payload))  # deep copy
        payload_v2["supplier"] = {
            "name": "Proveedor Persona Natural de prueba",
            "origin": "10",
            "organizationType": 2,
            "identificationType": "13",
            "identificationNumber": "1000000000",
            "regimeCode": "R-99-PN",
            "address": {"address": "Cra 1 # 2-3", "city": "11001", "department": "11", "country": "CO"},
        }
        call("POST", "/support-documents", json=payload_v2)


if __name__ == "__main__":
    main()
