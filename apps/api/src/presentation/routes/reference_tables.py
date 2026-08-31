import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.reference_table_service import ReferenceTableService, SincronizarReferenceTableService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.reference_table import ReferenceRecordRequest, ReferenceRecordResponse
from src.infrastructure.db.session import get_db

public_router = APIRouter(prefix="/api/v1/public/reference-tables", tags=["reference-tables-public"])
admin_router = APIRouter(prefix="/api/v1/admin/reference-tables", tags=["reference-tables-admin"])


@public_router.get("/{tabla}", response_model=list[ReferenceRecordResponse])
def listar_publico(tabla: str, db: Session = Depends(get_db)):
    registros = ReferenceTableService(db).listar(tabla)
    return [ReferenceRecordResponse.from_record(r) for r in registros]


@admin_router.get("/{tabla}", response_model=list[ReferenceRecordResponse])
def listar_admin(
    tabla: str,
    search: str | None = None,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    registros = ReferenceTableService(db).listar(tabla, search=search)
    return [ReferenceRecordResponse.from_record(r) for r in registros]


@admin_router.post("/{tabla}", response_model=ReferenceRecordResponse, status_code=201)
def crear_registro(
    tabla: str,
    body: ReferenceRecordRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    registro = ReferenceTableService(db).crear(tabla, body)
    return ReferenceRecordResponse.from_record(registro)


@admin_router.patch("/{tabla}/{registro_id}", response_model=ReferenceRecordResponse)
def actualizar_registro(
    tabla: str,
    registro_id: uuid.UUID,
    body: ReferenceRecordRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    registro = ReferenceTableService(db).actualizar(tabla, registro_id, body)
    return ReferenceRecordResponse.from_record(registro)


@admin_router.post("/{tabla}/sync")
def sincronizar_tabla(
    tabla: str,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    procesados = SincronizarReferenceTableService(db).sincronizar(tabla)
    return {"success": True, "processed": procesados}
