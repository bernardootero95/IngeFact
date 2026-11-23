from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.application.suscripcion_service import mensaje_plan_vencido
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.infrastructure.db.session import get_db

METODOS_DE_LECTURA = frozenset({"GET", "HEAD", "OPTIONS"})
CODIGO_PLAN_VENCIDO = "PLAN_VENCIDO"


def bloquear_escritura_con_plan_vencido(
    request: Request,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
) -> None:
    """Con el plan vencido la empresa queda en modo restringido: puede leer
    (su estado, el Excel con su informacion y el PDF/XML de sus documentos)
    pero la API rechaza cualquier escritura -- crear o editar terceros,
    productos, documentos, configuracion... Se aplica a todos los routers
    tenant en main.py. El envio a la DIAN ya lo bloqueaba
    suscripcion_service.verificar_plan_vigente."""
    if request.method in METODOS_DE_LECTURA:
        return
    motivo = mensaje_plan_vencido(db, tenant.empresa_id)
    if motivo:
        # El detalle va como texto (el cliente lo muestra tal cual); el header
        # permite distinguir este 403 de los de permisos.
        raise HTTPException(status.HTTP_403_FORBIDDEN, motivo, headers={"X-IngeFact-Error": CODIGO_PLAN_VENCIDO})
