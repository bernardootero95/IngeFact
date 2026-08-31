from datetime import date

import pytest
from fastapi import HTTPException

from src.core.dependencies import CurrentTenant
from src.domain.resolucion_dian import GuardarResolucionDianRequest
from src.infrastructure.db.models import Empresa
from src.presentation.routes.tenant_resolucion import guardar_resolucion, obtener_resolucion


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _tenant_de(empresa: Empresa) -> CurrentTenant:
    return CurrentTenant(id=empresa.id, email="tenant@example.com", empresa_id=empresa.id)


def test_obtener_resolucion_404_si_no_configurada(db_session):
    empresa = _crear_empresa(db_session)
    with pytest.raises(HTTPException) as exc_info:
        obtener_resolucion(db=db_session, tenant=_tenant_de(empresa))
    assert exc_info.value.status_code == 404


def test_guardar_resolucion_la_crea_y_queda_disponible_por_get(db_session):
    empresa = _crear_empresa(db_session)
    tenant = _tenant_de(empresa)
    body = GuardarResolucionDianRequest(
        numero_resolucion="18760000001",
        prefijo="SETP",
        rango_minimo=1,
        rango_maximo=1000,
        fecha_inicio=date(2026, 1, 1),
        fecha_fin=date(2030, 1, 1),
        technical_key="fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
    )

    creada = guardar_resolucion(body=body, db=db_session, tenant=tenant)
    obtenida = obtener_resolucion(db=db_session, tenant=tenant)

    assert creada.consecutivo_actual == 1
    assert obtenida.numero_resolucion == "18760000001"
