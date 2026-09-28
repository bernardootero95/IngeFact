"""
Re-consulta a Alegra las facturas que quedaron en 'enviada' (la DIAN no
resolvio en la respuesta sincrona y el webhook emissionFinished no llego) y
les aplica su estado real (aceptada/rechazada). Ver el detalle del hallazgo
en src/application/reconciliacion_facturas.py.

Mientras no pasen a 'aceptada', esas facturas no descuentan cupo del plan
del tenant aunque si aparecen en el KPI de actividad del admin.

Idempotente: solo toca facturas en 'enviada'; una que Alegra aun no
resuelve se deja igual para la siguiente corrida. Sirve para el backfill
puntual y tambien para correrlo periodico (cron del host).

USO (produccion, dentro del contenedor api):
    docker compose -f docker-compose.prod.yml exec api python scripts/reconciliar_facturas_enviadas.py
        -> solo reporta, no llama a Alegra ni escribe
    ... --aplicar
        -> consulta Alegra y actualiza estados, SIN correo al cliente final
    ... --aplicar --notificar
        -> ademas le envia al cliente final el correo de la factura aceptada
    ... --antiguedad-minutos 30
        -> solo facturas enviadas hace al menos 30 min (default 10)

Apunta a lo que digan ALEGRA_TOKEN/DATABASE_URL del entorno donde se corre
-- para produccion lo corre el usuario, nunca un asistente conectado
directo al servidor.
"""

import argparse
import sys
from collections import Counter
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from src.application.reconciliacion_facturas import (  # noqa: E402
    listar_facturas_enviadas,
    reconciliar_facturas_enviadas,
)
from src.core.alegra_client import AlegraClient  # noqa: E402
from src.core.config import get_settings  # noqa: E402
from src.infrastructure.db.models import Empresa  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--aplicar", action="store_true", help="Consulta Alegra y actualiza los estados.")
    parser.add_argument("--notificar", action="store_true", help="Envia el correo al cliente de cada factura aceptada.")
    parser.add_argument("--antiguedad-minutos", type=int, default=10)
    args = parser.parse_args()
    antiguedad = timedelta(minutes=args.antiguedad_minutos)

    settings = get_settings()
    db = sessionmaker(bind=create_engine(settings.database_url))()
    print(f"Ambiente Alegra: {settings.alegra_env} ({settings.alegra_base_url})")

    pendientes = listar_facturas_enviadas(db, antiguedad=antiguedad)
    por_empresa = Counter(f.empresa_id for f in pendientes)
    print(f"{len(pendientes)} factura(s) en 'enviada' con mas de {args.antiguedad_minutos} min.")
    for empresa_id, total in por_empresa.most_common():
        empresa = db.get(Empresa, empresa_id)
        print(f"  - {empresa.razon_social} (NIT {empresa.numero_identificacion}): {total}")

    if not args.aplicar:
        print("\nModo reporte (sin --aplicar): no se llamo a Alegra ni se modifico nada.")
        return
    if not pendientes:
        return

    resultado = reconciliar_facturas_enviadas(
        db, AlegraClient(), antiguedad=antiguedad, notificar_clientes=args.notificar
    )
    print(
        f"\nRevisadas {resultado.revisadas}: {resultado.aceptadas} aceptadas, "
        f"{resultado.rechazadas} rechazadas, {resultado.sin_resolver} aun sin respuesta DIAN, "
        f"{len(resultado.errores)} con error al consultar Alegra."
    )
    for factura_id, error in resultado.errores:
        print(f"  ERROR factura {factura_id}: {error}")
    if resultado.sin_resolver or resultado.errores:
        print("Vuelve a correr el script mas tarde (es idempotente) para las pendientes.")


if __name__ == "__main__":
    main()
