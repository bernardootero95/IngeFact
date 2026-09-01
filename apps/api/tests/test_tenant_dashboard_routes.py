from datetime import date

from src.application.cliente_service import ClienteService
from src.application.resolucion_dian_service import ResolucionDianService
from src.core.dependencies import CurrentTenant
from src.domain.cliente import CrearClienteRequest
from src.domain.resolucion_dian import GuardarResolucionDianRequest
from src.infrastructure.db.models import Empresa
from src.presentation.routes.tenant_dashboard import obtener_kpis


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


def test_clientes_registrados_refleja_el_conteo_real(db_session):
    empresa = _crear_empresa(db_session)
    ClienteService(db_session).crear(
        empresa.id,
        CrearClienteRequest(
            tipo_identificacion="31",
            numero_identificacion="900123456",
            nombre="Cliente Uno",
            correo_electronico="cliente@example.com",
        ),
    )

    kpis = obtener_kpis(db=db_session, tenant=_tenant_de(empresa))

    assert kpis.clientes_registrados == 1


def test_clientes_registrados_no_cuenta_clientes_de_otro_tenant(db_session):
    empresa_a = _crear_empresa(db_session, numero_identificacion="900618467")
    empresa_b = _crear_empresa(db_session, numero_identificacion="900618468")
    ClienteService(db_session).crear(
        empresa_a.id,
        CrearClienteRequest(
            tipo_identificacion="31",
            numero_identificacion="900123456",
            nombre="Cliente Uno",
            correo_electronico="cliente@example.com",
        ),
    )

    kpis = obtener_kpis(db=db_session, tenant=_tenant_de(empresa_b))

    assert kpis.clientes_registrados == 0


def test_resolucion_configurada_false_si_no_existe(db_session):
    empresa = _crear_empresa(db_session)

    kpis = obtener_kpis(db=db_session, tenant=_tenant_de(empresa))

    assert kpis.resolucion_configurada is False


def test_resolucion_configurada_true_si_existe(db_session):
    empresa = _crear_empresa(db_session)
    ResolucionDianService(db_session).guardar(
        empresa.id,
        GuardarResolucionDianRequest(
            numero_resolucion="18760000001",
            prefijo="SETP",
            rango_minimo=1,
            rango_maximo=1000,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2030, 1, 1),
            technical_key="fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        ),
    )

    kpis = obtener_kpis(db=db_session, tenant=_tenant_de(empresa))

    assert kpis.resolucion_configurada is True
