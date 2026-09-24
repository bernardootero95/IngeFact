"""
Script de investigacion Fase 5 (Nomina Electronica) -- Fase A del plan.

Golpea el sandbox REAL de Alegra (mismo patron que explore_alegra_support_document.py)
para cerrar lo que la documentacion estatica de e-provider-docs.alegra.com NO
confirma (ver docs/alegra-investigacion.md, seccion "Nomina Electronica"):

1. Valores reales de los catalogos de nomina (/dian/employee-types,
   employee-sub-types, contract-types, payroll-periods) -- la doc solo da el
   shape generico {"table"/"data": [{"code","value"}]}, sin valores.
2. Si existen de verdad /dian/extra-hour-types y /dian/inability-types (solo
   el nombre del endpoint aparecia en el indice llms.txt, sin confirmar).
3. Si Pago.Forma/Pago.Metodo de nomina usan los mismos catalogos
   formas_pago/metodos_pago ya sincronizados para facturas, o catalogos
   propios.
4. Crear un test-set type="payrolls" para la empresa de pruebas sandbox.
5. POST /payrolls minimo (Basico + Salud + FondoPension) y confirmar el shape
   real de la respuesta -- la spec cruda (via curl) dice que viene envuelta
   en "payroll" (no "emission", que es el nombre de la propiedad en el
   schema pero no la clave real del ejemplo) con legalStatus
   ACCEPTED/ACCEPTED_WITH_OBSERVATIONS/REJECTED, igual que facturas.
6. GET /payrolls/{id} -- confirmar si trae una URL descargable de XML (como
   Factura/Documento Soporte) o solo xmlFileName/zipFileName (como dice el
   schema), en cuyo caso hace falta otro mecanismo para bajar el archivo.

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

# Empresa asociada real (NIT 900559088) -- mismo id ya usado en
# explore_alegra_credit_note.py / explore_alegra_support_document.py.
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
    print("\n\n########## 1) Catalogos de nomina ##########", file=sys.stderr)
    for path in (
        "/dian/employee-types",
        "/dian/employee-sub-types",
        "/dian/contract-types",
        "/dian/payroll-periods",
        "/dian/extra-hour-types",
        "/dian/inability-types",
    ):
        call("GET", path)

    print("\n\n########## 2) Test-set type=payrolls ##########", file=sys.stderr)
    call(
        "POST",
        "/test-sets",
        json={"type": "payrolls", "governmentId": SANDBOX_GOVERNMENT_ID, "company": {"id": COMPANY_ID}},
    )

    print("\n\n########## 3) POST /payrolls minimo (Basico + Salud + FondoPension) ##########", file=sys.stderr)
    numero = random.randint(1, 999999)
    payload = {
        "company": {"id": COMPANY_ID},
        "prefix": "NE",
        "number": numero,
        "governmentData": {
            "Periodo": {
                "FechaIngreso": "2024-01-15",
                "FechaLiquidacionInicio": "2026-09-01",
                "FechaLiquidacionFin": "2026-09-30",
            },
            "LugarGeneracionXML": {"Pais": "CO", "MunicipioCiudad": "11001"},
            "InformacionGeneral": {"PeriodoNomina": "5", "TipoMoneda": "COP"},
            "Empleador": {
                "NIT": 900559088,
                "DV": 2,
                "Pais": "CO",
                "MunicipioCiudad": "11001",
                "Direccion": "Calle de prueba 123",
            },
            "Trabajador": {
                "TipoTrabajador": "01",
                "SubTipoTrabajador": "00",
                "AltoRiesgoPension": False,
                "TipoDocumento": "13",
                "NumeroDocumento": 1000000000,
                "PrimerApellido": "Perez",
                "PrimerNombre": "Juan",
                "LugarTrabajoPais": "CO",
                "LugarTrabajoMunicipioCiudad": "11001",
                "LugarTrabajoDireccion": "Calle de prueba 123",
                "SalarioIntegral": False,
                "TipoContrato": "1",
                "Sueldo": 2000000,
            },
            "Pago": {"Forma": "1", "Metodo": "10"},
            "FechasPagos": {"FechaPago": ["2026-09-30"]},
            "Devengados": {
                "Basico": {"DiasTrabajados": 30, "SueldoTrabajado": 2000000},
            },
            "Deducciones": {
                "Salud": {"Porcentaje": 4, "Deduccion": 80000},
                "FondoPension": {"Porcentaje": 4, "Deduccion": 80000},
            },
            "DevengadosTotal": 2000000,
            "DeduccionesTotal": 160000,
            "ComprobanteTotal": 1840000,
        },
    }
    resp_create, body_create = call("POST", "/payrolls", json=payload)

    payroll_id = None
    if body_create:
        payroll_id = (body_create.get("payroll") or body_create.get("emission") or {}).get("id")

    if payroll_id:
        print(f"\n\n########## 4) GET /payrolls/{{id}} (id={payroll_id}) ##########", file=sys.stderr)
        call("GET", f"/payrolls/{payroll_id}")
    else:
        print("\n\nNo se obtuvo un id de nomina creada -- no se puede hacer GET.", file=sys.stderr)

    print(f"\n\nnumero usado: {numero}", file=sys.stderr)


if __name__ == "__main__":
    main()
