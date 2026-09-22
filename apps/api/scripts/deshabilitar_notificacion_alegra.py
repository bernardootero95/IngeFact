"""
Deshabilita el correo de notificacion automatico que Alegra le envia al
cliente/customer de una factura cuando genera un documento electronico
valido (Factura, Nota Credito, Nota Debito) -- controlado por el campo de
empresa `notificationByEmail.enabled` (confirmado contra
https://e-provider-docs.alegra.com/reference/createcompany y
https://e-provider-docs.alegra.com/reference/updatecompany).

Motivo (hallazgo 2026-09-22): IngeFact ya envia su propio correo al cliente
tras cada factura aceptada (notificar_factura_aceptada, Resend); como Alegra
no traia este campo en el payload de creacion, usaba su default (el cliente
recibia el correo de Alegra Y el de IngeFact). apps/api/src/application/
empresa_service.py::_build_alegra_payload ya lo manda en `False` para las
empresas NUEVAS -- este script es el backfill para las que ya existian antes
de ese cambio.

Es *un solo uso por entorno* (dev/sandbox o produccion, segun el .env que
cargue) -- correrlo de nuevo no hace dano (PATCH es idempotente), pero no
hace falta repetirlo salvo que se provisionen empresas por fuera de
CreateEmpresaAlegraService.crear().

USO:
    cd apps/api
    ./venv/Scripts/python.exe scripts/deshabilitar_notificacion_alegra.py          # solo reporta, no escribe
    ./venv/Scripts/python.exe scripts/deshabilitar_notificacion_alegra.py --aplicar  # aplica el cambio en Alegra

Este script apunta a lo que diga el ALEGRA_TOKEN/DATABASE_URL de apps/api/.env
en el momento de correrlo -- para produccion, el usuario debe correrlo el
mismo con el .env de produccion cargado (o las variables exportadas), nunca
un asistente conectado directo al servidor.
"""

import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import create_engine, select  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError  # noqa: E402
from src.core.config import get_settings  # noqa: E402
from src.infrastructure.db.models import Empresa  # noqa: E402

PAYLOAD = {"notificationByEmail": {"enabled": False}}


def main() -> None:
    aplicar = "--aplicar" in sys.argv

    settings = get_settings()
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    alegra = AlegraClient()

    empresas = (
        db.execute(select(Empresa).where(Empresa.id_alegra.is_not(None)).order_by(Empresa.razon_social)).scalars().all()
    )

    print(f"Ambiente Alegra: {settings.alegra_env} ({settings.alegra_base_url})")
    print(f"{len(empresas)} empresa(s) con id_alegra asignado.")
    if not aplicar:
        print("Modo reporte (sin --aplicar): no se llama a Alegra. Empresas encontradas:")
        for empresa in empresas:
            print(f"  - {empresa.razon_social} (NIT {empresa.numero_identificacion}, id_alegra={empresa.id_alegra})")
        print("\nCorre de nuevo con --aplicar para deshabilitar notificationByEmail en cada una.")
        return

    ok, fallidas = 0, []
    for empresa in empresas:
        try:
            alegra.update_company(empresa.id_alegra, PAYLOAD)
            ok += 1
            print(f"OK  {empresa.razon_social} (NIT {empresa.numero_identificacion})")
        except (AlegraApiError, AlegraTransientError) as exc:
            fallidas.append((empresa, exc))
            print(f"ERROR {empresa.razon_social} (NIT {empresa.numero_identificacion}): {exc}")

    print(f"\n{ok}/{len(empresas)} actualizadas. {len(fallidas)} fallidas.")
    if fallidas:
        print("Revisa y vuelve a correr el script (es idempotente) para las que fallaron.")


if __name__ == "__main__":
    main()
