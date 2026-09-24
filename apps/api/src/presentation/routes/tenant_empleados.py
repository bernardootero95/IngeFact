import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.empleado_service import EmpleadoService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.empleado import ActualizarEmpleadoRequest, CrearEmpleadoRequest, EmpleadoResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/empleados", tags=["tenant"])


@router.get("", response_model=list[EmpleadoResponse])
def listar_empleados(
    search: str | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    empleados = EmpleadoService(db).listar(tenant.empresa_id, search=search)
    return [EmpleadoResponse.from_model(e) for e in empleados]


@router.get("/{empleado_id}", response_model=EmpleadoResponse)
def obtener_empleado(
    empleado_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    empleado = EmpleadoService(db).obtener(tenant.empresa_id, empleado_id)
    return EmpleadoResponse.from_model(empleado)


@router.post("", response_model=EmpleadoResponse, status_code=201)
def crear_empleado(
    body: CrearEmpleadoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    empleado = EmpleadoService(db).crear(tenant.empresa_id, body)
    return EmpleadoResponse.from_model(empleado)


@router.patch("/{empleado_id}", response_model=EmpleadoResponse)
def actualizar_empleado(
    empleado_id: uuid.UUID,
    body: ActualizarEmpleadoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    empleado = EmpleadoService(db).actualizar(tenant.empresa_id, empleado_id, body)
    return EmpleadoResponse.from_model(empleado)


@router.delete("/{empleado_id}", status_code=204)
def eliminar_empleado(
    empleado_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    EmpleadoService(db).eliminar(tenant.empresa_id, empleado_id)
