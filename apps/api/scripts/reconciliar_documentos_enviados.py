"""
Re-consulta a Alegra los documentos que quedaron en 'enviada'/'enviado'
(Facturas, Notas Credito, Notas Debito, Nominas y Documentos Soporte: la
DIAN no resolvio en la respuesta sincrona y el webhook emissionFinished no
llego) y les aplica su estado real (aceptado/rechazado). Ver el detalle del
hallazgo en src/application/reconciliacion_documentos.py.

Mientras no pasen a aceptado, esos documentos no descuentan cupo del plan
del tenant aunque si aparecen en el KPI de actividad del admin.

Idempotente: solo toca documentos pendientes; uno que Alegra aun no
resuelve se deja igual para la siguiente corrida. Sirve para el backfill
puntual y tambien para correrlo periodico (cron del host).

USO (produccion, dentro del contenedor api):
    docker compose -f docker-compose.prod.yml exec api python scripts/reconciliar_documentos_enviados.py
        -> solo reporta, no llama a Alegra ni escribe
    ... --aplicar
        -> consulta Alegra y actualiza estados, SIN correo al cliente/proveedor
    ... --aplicar --notificar
        -> ademas envia el correo del documento aceptado (factura al
           cliente, documento soporte al proveedor)
    ... --antiguedad-minutos 30
        -> solo documentos enviados hace al menos 30 min (default 10)

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

from src.application.reconciliacion_documentos import (  # noqa: E402
    TIPOS_DOCUMENTO,
    listar_pendientes,
    reconciliar_documentos_enviados,
)
from src.core.alegra_client import AlegraClient  # noqa: E402
from src.core.config import get_settings  # noqa: E402
from src.infrastructure.db.models import Empresa  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--aplicar", action="store_true", help="Consulta Alegra y actualiza los estados.")
    parser.add_argument(
        "--notificar", action="store_true", help="Envia el correo al cliente/proveedor de cada documento aceptado."
    )
    parser.add_argument("--antiguedad-minutos", type=int, default=10)
    args = parser.parse_args()
    antiguedad = timedelta(minutes=args.antiguedad_minutos)

    settings = get_settings()
    db = sessionmaker(bind=create_engine(settings.database_url))()
    print(f"Ambiente Alegra: {settings.alegra_env} ({settings.alegra_base_url})")
    print(f"Documentos pendientes con mas de {args.antiguedad_minutos} min:")

    total_pendientes = 0
    for tipo in TIPOS_DOCUMENTO:
        pendientes = listar_pendientes(db, tipo, antiguedad=antiguedad)
        total_pendientes += len(pendientes)
        print(f"  {tipo.nombre}: {len(pendientes)}")
        for empresa_id, total in Counter(d.empresa_id for d in pendientes).most_common():
            empresa = db.get(Empresa, empresa_id)
            print(f"    - {empresa.razon_social} (NIT {empresa.numero_identificacion}): {total}")

    if not args.aplicar:
        print("\nModo reporte (sin --aplicar): no se llamo a Alegra ni se modifico nada.")
        return
    if not total_pendientes:
        return

    resultados = reconciliar_documentos_enviados(
        db, AlegraClient(), antiguedad=antiguedad, notificar_clientes=args.notificar
    )
    print()
    hay_pendientes = False
    for nombre, resultado in resultados.items():
        if not resultado.revisados:
            continue
        print(
            f"{nombre}: revisados {resultado.revisados} -> {resultado.aceptados} aceptados, "
            f"{resultado.rechazados} rechazados, {resultado.sin_resolver} aun sin respuesta DIAN, "
            f"{len(resultado.errores)} con error al consultar Alegra."
        )
        for documento_id, error in resultado.errores:
            print(f"  ERROR {documento_id}: {error}")
        hay_pendientes = hay_pendientes or bool(resultado.sin_resolver or resultado.errores)
    if hay_pendientes:
        print("Vuelve a correr el script mas tarde (es idempotente) para los pendientes.")


if __name__ == "__main__":
    main()
