import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from src.core.alegra_client import AlegraClient
from src.domain.reference_table import ReferenceRecordRequest, VALID_TABLES
from src.infrastructure.db.models import REFERENCE_TABLE_MODELS

logger = logging.getLogger(__name__)

# Tabla -> (path del catalogo DIAN en Alegra, clave bajo la que responde
# externalData). Portado 1:1 de supabase/functions/sync-reference-table.
ALEGRA_CATALOG_CONFIG = {
    "tipos_identificacion": ("/dian/identification-types", "identification-types"),
    "monedas": ("/dian/currencies", "currencies"),
    "formas_pago": ("/dian/payment-forms", "payment-forms"),
    "metodos_pago": ("/dian/payment-methods", "payment-methods"),
    "paises": ("/dian/countries", "countries"),
    "departamentos": ("/dian/departments", "departments"),
    "municipios": ("/dian/municipalities", "municipalities"),
    "tipos_organizacion": ("/dian/organization-types", "organization-types"),
    "responsabilidades_fiscales": ("/dian/fiscal-Responsability-types", "fiscal-Responsability-types"),
    "tributos": ("/dian/tax-types", "tax-types"),
    "tipos_unidad": ("/dian/unit-codes", "unit-codes"),
    "conceptos_nota_credito": ("/dian/correction-concept-codes-nc", "correction-concept-codes-nc"),
    "conceptos_nota_debito": ("/dian/correction-concept-codes-nd", "correction-concept-codes-nd"),
}

BATCH_SIZE = 250


def _validar_tabla(tabla: str) -> None:
    if tabla not in VALID_TABLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Tabla de referencia desconocida: {tabla}")


class ReferenceTableService:
    """CRUD generico sobre cualquiera de las 13 tablas de catalogo DIAN."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, tabla: str, search: str | None = None):
        _validar_tabla(tabla)
        model = REFERENCE_TABLE_MODELS[tabla]
        query = select(model).where(model.eliminado.is_(None)).order_by(model.code)
        if search:
            like = f"%{search}%"
            query = query.where((model.code.ilike(like)) | (model.value.ilike(like)))
        return list(self.db.execute(query).scalars().all())

    def crear(self, tabla: str, data: ReferenceRecordRequest):
        _validar_tabla(tabla)
        model = REFERENCE_TABLE_MODELS[tabla]
        kwargs = {"code": data.code, "value": data.value, "estado": data.estado}
        if tabla == "municipios":
            kwargs["department_code"] = data.department_code
            kwargs["department_value"] = data.department_value
        if tabla in ("conceptos_nota_credito", "conceptos_nota_debito"):
            kwargs["value_nade"] = data.value_nade

        registro = model(**kwargs)
        self.db.add(registro)
        self.db.commit()
        self.db.refresh(registro)
        return registro

    def actualizar(self, tabla: str, registro_id, data: ReferenceRecordRequest):
        _validar_tabla(tabla)
        model = REFERENCE_TABLE_MODELS[tabla]
        registro = self.db.get(model, registro_id)
        if registro is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro no encontrado.")

        registro.code = data.code
        registro.value = data.value
        registro.estado = data.estado
        if tabla == "municipios":
            registro.department_code = data.department_code
            registro.department_value = data.department_value
        if tabla in ("conceptos_nota_credito", "conceptos_nota_debito"):
            registro.value_nade = data.value_nade

        self.db.add(registro)
        self.db.commit()
        self.db.refresh(registro)
        return registro


class SincronizarReferenceTableService:
    """Trae un catalogo DIAN completo desde Alegra y lo upsertea local por code."""

    def __init__(self, db: Session, alegra_client: AlegraClient | None = None):
        self.db = db
        self.alegra = alegra_client or AlegraClient()

    def sincronizar(self, tabla: str) -> int:
        _validar_tabla(tabla)
        if tabla not in ALEGRA_CATALOG_CONFIG:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{tabla}' no tiene catalogo sincronizable en Alegra.")

        path, key = ALEGRA_CATALOG_CONFIG[tabla]
        items = self.alegra.get_reference_catalog(path, key)
        if not items:
            return 0

        model = REFERENCE_TABLE_MODELS[tabla]
        total = 0
        for i in range(0, len(items), BATCH_SIZE):
            batch = items[i : i + BATCH_SIZE]
            registros = [self._transformar(tabla, item) for item in batch]
            # Mismo bug ya visto en el sync de empresas: Alegra puede repetir
            # un `code` dentro del mismo lote, lo que rompe el upsert masivo.
            por_code = {r["code"]: r for r in registros}
            registros_dedup = list(por_code.values())

            stmt = insert(model).values(registros_dedup)
            set_cols = {c: getattr(stmt.excluded, c) for c in registros_dedup[0] if c != "code"}
            stmt = stmt.on_conflict_do_update(index_elements=[model.code], set_=set_cols)
            self.db.execute(stmt)
            total += len(registros_dedup)

        self.db.commit()
        return total

    @staticmethod
    def _transformar(tabla: str, item: dict) -> dict:
        registro = {
            "code": str(item.get("code")),
            "value": item.get("value"),
            "estado": "activo",
            "actualizado": datetime.now(timezone.utc),
        }
        if tabla == "municipios":
            registro["department_code"] = str(item.get("departmentCode"))
            registro["department_value"] = item.get("departmentValue")
        if tabla in ("conceptos_nota_credito", "conceptos_nota_debito"):
            # Siempre se incluye la clave (aunque sea None): un insert masivo
            # de SQLAlchemy exige el mismo set de columnas en todas las filas
            # del batch, a diferencia del upsert por fila de PostgREST.
            registro["value_nade"] = item.get("valueNADE") or None
        return registro
