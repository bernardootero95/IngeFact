import logging
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from src.core.alegra_client import AlegraClient
from src.infrastructure.db.models import Empresa

logger = logging.getLogger(__name__)


class SincronizarEmpresasAlegraService:
    """Trae todas las empresas de Alegra y las upsertea localmente por NIT.

    Porta 1:1 la logica de supabase/functions/sync-companies/index.ts: mismo
    mapeo de campos (incluido el mapeo simplificado de regimen O-48/O-49) y
    misma paginacion basada en metadata.to/results_count.
    """

    PAGE_SIZE = 80

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self.alegra = alegra_client or AlegraClient()

    def sincronizar(self) -> int:
        companies = self._fetch_all()
        if not companies:
            return 0

        # Alegra puede repetir el mismo NIT dentro del mismo listado (visto en
        # sandbox real) -- si dos filas del batch comparten numero_identificacion,
        # el ON CONFLICT DO UPDATE falla ("cannot affect row a second time").
        # Se deduplica quedandose con la ultima ocurrencia (dato mas reciente).
        por_nit = {r["numero_identificacion"]: r for r in (self._transformar(c) for c in companies)}
        registros = list(por_nit.values())

        stmt = insert(Empresa).values(registros)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Empresa.numero_identificacion],
            set_={
                "id_alegra": stmt.excluded.id_alegra,
                "razon_social": stmt.excluded.razon_social,
                "nombre_comercial": stmt.excluded.nombre_comercial,
                "digito_verificacion": stmt.excluded.digito_verificacion,
                "tipo_identificacion": stmt.excluded.tipo_identificacion,
                "correo_electronico": stmt.excluded.correo_electronico,
                "telefono": stmt.excluded.telefono,
                "direccion": stmt.excluded.direccion,
                "departamento": stmt.excluded.departamento,
                "municipio": stmt.excluded.municipio,
                "regimen": stmt.excluded.regimen,
                "estado": stmt.excluded.estado,
                "actualizado": stmt.excluded.actualizado,
            },
        )
        self.db.execute(stmt)
        self.db.commit()
        return len(registros)

    def _fetch_all(self) -> list[dict]:
        all_companies: list[dict] = []
        from_id = 0
        while True:
            body = self.alegra.list_companies(from_id=from_id, limit=self.PAGE_SIZE)
            companies = body.get("companies") or []
            all_companies.extend(companies)

            metadata = body.get("metadata") or {}
            if metadata.get("to") and metadata.get("results_count") == self.PAGE_SIZE:
                from_id = metadata["to"]
            else:
                break
        return all_companies

    @staticmethod
    def _transformar(c: dict) -> dict:
        address = c.get("address") or {}
        regimen = "48" if c.get("regimeCode") == "O-48" else "49"
        return {
            "id_alegra": str(c.get("id")),
            "razon_social": c.get("name"),
            "nombre_comercial": c.get("tradeName"),
            "numero_identificacion": c.get("identification"),
            "digito_verificacion": c.get("dv"),
            "tipo_identificacion": c.get("identificationType") or "31",
            "correo_electronico": c.get("email") or "sin_correo@empresa.com",
            "telefono": c.get("phone"),
            "direccion": address.get("address"),
            "departamento": address.get("department"),
            "municipio": address.get("city"),
            "regimen": regimen,
            "estado": "activo",
            "actualizado": datetime.now(timezone.utc),
        }
