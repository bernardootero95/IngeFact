"""
Fixture de desarrollo -- resolucion de pruebas que SI queda ACEPTADA por la DIAN.

Hallazgo (post-cierre Sprint 8, ver docs/alegra-investigacion.md seccion
"Resolucion de pruebas real"): la resolucion de ejemplo de la documentacion
de Alegra (resolutionNumber 18760000001, prefix SETP, minNumber 990000000,
maxNumber 995000000, technicalKey fc8eac422eba16e22ffd8c6f94b3f40a6e38162c)
SI es una resolucion real y valida -- pero esta registrada ante la DIAN a
nombre del NIT publico de pruebas de Alegra (900559088, DV 2), no de un NIT
inventado. Cualquier empresa asociada que se cree en el sandbox CON ESE
MISMO NIT hereda esa resolucion y puede emitir facturas de prueba que la
DIAN acepta de verdad (legalStatus ACCEPTED_WITH_OBSERVATIONS).

Este script:
1. Crea (o reusa si ya existe) una empresa asociada en el sandbox de Alegra
   con NIT 900559088 / DV 2, y la habilita con un test-set.
2. Busca la empresa del tenant de pruebas local (usuario tenant@example.com)
   en la base de datos de desarrollo y actualiza su id_alegra +
   numero_identificacion/digito_verificacion para que coincidan.
3. Upsert de su ResolucionDian con los valores reales de arriba,
   consecutivo_actual reseteado a rango_minimo.

Uso: correrlo una vez para que el tenant sembrado pueda emitir facturas de
verdad ACEPTADAS en el ambiente de desarrollo. Reusa el token de
apps/api/.env -- no correr contra produccion.
"""

import sys
from datetime import date
from pathlib import Path

import httpx
from dotenv import load_dotenv
import os

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402

from src.infrastructure.db.models import Empresa, ResolucionDian, UsuarioEmpresa  # noqa: E402

BASE_URL = os.environ["ALEGRA_BASE_URL"]
TOKEN = os.environ["ALEGRA_TOKEN"]
SANDBOX_GOVERNMENT_ID = "a70562e0-631e-4ceb-aa65-36887b57dc17"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "Accept": "application/json"}

TEST_NIT = "900559088"
TEST_DV = "2"
RESOLUTION = {
    "numero_resolucion": "18760000001",
    "prefijo": "SETP",
    "rango_minimo": 990000000,
    "rango_maximo": 995000000,
    "fecha_inicio": date(2019, 1, 19),
    "fecha_fin": date(2030, 1, 19),
    "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
}

TENANT_EMAIL = "tenant@example.com"


def crear_empresa_alegra() -> str:
    resp = httpx.post(
        f"{BASE_URL}/companies",
        headers=HEADERS,
        json={
            "name": "IngeFact Dev - Resolucion de pruebas",
            "tradeName": "IngeFact Dev Test",
            "identification": TEST_NIT,
            "dv": TEST_DV,
            "useAlegraCertificate": True,
            "identificationType": "31",
            "email": "dev-test-resolution@ingefact.dev",
            "phone": "3000000000",
            "organizationType": 1,
            "regimeCode": "R-99-PN",
            "address": {"address": "Calle de prueba 123", "department": "11", "city": "11001", "country": "CO"},
        },
        timeout=30,
    )
    resp.raise_for_status()
    company_id = resp.json()["company"]["id"]

    resp = httpx.post(
        f"{BASE_URL}/test-sets",
        headers=HEADERS,
        json={"type": "invoices", "governmentId": SANDBOX_GOVERNMENT_ID, "company": {"id": company_id}},
        timeout=30,
    )
    resp.raise_for_status()

    return company_id


def main():
    print("Creando empresa asociada en Alegra con NIT de pruebas 900559088...")
    company_id = crear_empresa_alegra()
    print(f"company_id: {company_id}")

    engine = create_engine(os.environ["DATABASE_URL"])
    Session = sessionmaker(bind=engine)
    db = Session()

    usuario = db.execute(select(UsuarioEmpresa).where(UsuarioEmpresa.email == TENANT_EMAIL)).scalar_one_or_none()
    if usuario is None:
        print(f"No se encontro ningun usuario con email {TENANT_EMAIL}, abortando.")
        return

    empresa = db.get(Empresa, usuario.empresa_id)
    print(f"Empresa encontrada: {empresa.razon_social} ({empresa.id})")

    empresa.id_alegra = company_id
    empresa.numero_identificacion = TEST_NIT
    empresa.digito_verificacion = TEST_DV
    db.add(empresa)

    resolucion = db.execute(
        select(ResolucionDian).where(ResolucionDian.empresa_id == empresa.id)
    ).scalar_one_or_none()
    if resolucion is None:
        resolucion = ResolucionDian(empresa_id=empresa.id)
    for campo, valor in RESOLUTION.items():
        setattr(resolucion, campo, valor)
    resolucion.consecutivo_actual = RESOLUTION["rango_minimo"]
    resolucion.estado_validacion = "pendiente"
    resolucion.mensaje_validacion = None
    db.add(resolucion)

    db.commit()
    print(f"Empresa '{empresa.razon_social}' actualizada: NIT {TEST_NIT}, id_alegra={company_id}")
    print("Resolucion DIAN de pruebas (SETP, 990000000-995000000) configurada y lista para emitir.")


if __name__ == "__main__":
    main()
