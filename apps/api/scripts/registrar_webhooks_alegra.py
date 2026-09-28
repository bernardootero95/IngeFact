"""
Registra los webhooks de IngeFact en cada empresa ya provisionada en Alegra
(PATCH /companies/{id} con el bloque `webhooks`, ver
src/core/alegra_webhooks.py).

Motivo (hallazgo 2026-09-28): IngeFact nunca registraba webhooks -- en
Alegra se configuran por empresa -- asi que en produccion jamas llego uno.
CreateEmpresaAlegraService ya los manda al crear empresas NUEVAS (si
API_PUBLIC_URL y ALEGRA_WEBHOOK_SECRET estan configurados); este script es
el backfill para las que ya existian.

Idempotente: el PATCH vuelve a escribir la misma configuracion. Tambien
sirve para rotar el secreto (cambiar ALEGRA_WEBHOOK_SECRET, reiniciar el API
y volver a correrlo con --aplicar).

USO (produccion, dentro del contenedor api):
    docker compose -f docker-compose.prod.yml exec api python scripts/registrar_webhooks_alegra.py
        -> solo reporta (empresas y URLs que se registrarian), no escribe
    ... --aplicar
        -> registra los webhooks en Alegra

Apunta a lo que digan ALEGRA_TOKEN/DATABASE_URL/API_PUBLIC_URL del entorno
donde se corre -- para produccion lo corre el usuario, nunca un asistente
conectado directo al servidor.
"""

import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import create_engine, select  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from src.core.alegra_client import AlegraApiError, AlegraClient, AlegraTransientError  # noqa: E402
from src.core.alegra_webhooks import construir_config_webhooks, webhooks_configurados  # noqa: E402
from src.core.config import get_settings  # noqa: E402
from src.infrastructure.db.models import Empresa  # noqa: E402


def main() -> None:
    aplicar = "--aplicar" in sys.argv
    settings = get_settings()
    print(f"Ambiente Alegra: {settings.alegra_env} ({settings.alegra_base_url})")

    if not webhooks_configurados(settings):
        print("Faltan API_PUBLIC_URL y/o ALEGRA_WEBHOOK_SECRET en el entorno: no hay nada que registrar.")
        sys.exit(1)

    config = construir_config_webhooks(settings)
    print("Webhooks a registrar (el secreto va en el header, no se imprime):")
    for clave, eventos in config.items():
        for evento, entrada in eventos.items():
            print(f"  {clave}.{evento} -> {entrada['url']}")

    db = sessionmaker(bind=create_engine(settings.database_url))()
    empresas = (
        db.execute(select(Empresa).where(Empresa.id_alegra.is_not(None)).order_by(Empresa.razon_social)).scalars().all()
    )
    print(f"\n{len(empresas)} empresa(s) con id_alegra asignado.")
    if not aplicar:
        for empresa in empresas:
            print(f"  - {empresa.razon_social} (NIT {empresa.numero_identificacion}, id_alegra={empresa.id_alegra})")
        print("\nModo reporte (sin --aplicar): no se llamo a Alegra. Corre de nuevo con --aplicar para registrarlos.")
        return

    alegra = AlegraClient()
    ok, fallidas = 0, []
    for empresa in empresas:
        try:
            alegra.update_company(empresa.id_alegra, {"webhooks": config})
            ok += 1
            print(f"OK    {empresa.razon_social} (NIT {empresa.numero_identificacion})")
        except (AlegraApiError, AlegraTransientError) as exc:
            fallidas.append(empresa)
            print(f"ERROR {empresa.razon_social} (NIT {empresa.numero_identificacion}): {exc}")

    print(f"\n{ok}/{len(empresas)} actualizadas. {len(fallidas)} fallidas.")
    if fallidas:
        print("Revisa y vuelve a correr el script (es idempotente) para las que fallaron.")


if __name__ == "__main__":
    main()
