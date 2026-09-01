from src.application.dashboard_service import DashboardService
from src.infrastructure.db.models import Empresa


def _crear_empresa(db_session, *, razon_social, nit, estado):
    empresa = Empresa(
        razon_social=razon_social,
        numero_identificacion=nit,
        digito_verificacion="1",
        correo_electronico=f"{nit}@example.com",
        estado=estado,
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def test_obtener_kpis_sin_empresas(db_session):
    kpis = DashboardService(db_session).obtener_kpis()

    assert kpis["total_empresas"] == 0
    assert kpis["empresas_activas"] == 0
    assert kpis["empresas_inactivas"] == 0
    assert kpis["empresas_con_error_alegra"] == 0
    assert kpis["documentos_emitidos_mes"] == 0
    assert kpis["ultimas_empresas"] == []


def test_obtener_kpis_cuenta_por_estado(db_session):
    _crear_empresa(db_session, razon_social="Activa 1", nit="900000001", estado="activo")
    _crear_empresa(db_session, razon_social="Activa 2", nit="900000002", estado="activo")
    _crear_empresa(db_session, razon_social="Inactiva", nit="900000003", estado="inactivo")
    _crear_empresa(db_session, razon_social="Con error", nit="900000004", estado="error_alegra")

    kpis = DashboardService(db_session).obtener_kpis()

    assert kpis["total_empresas"] == 4
    assert kpis["empresas_activas"] == 2
    assert kpis["empresas_inactivas"] == 1
    assert kpis["empresas_con_error_alegra"] == 1


def test_obtener_kpis_ultimas_empresas_limita_a_5_mas_recientes(db_session):
    for i in range(7):
        _crear_empresa(db_session, razon_social=f"Empresa {i}", nit=f"90000100{i}", estado="activo")

    kpis = DashboardService(db_session).obtener_kpis()

    assert len(kpis["ultimas_empresas"]) == 5
    nombres = {e["razon_social"] for e in kpis["ultimas_empresas"]}
    assert "Empresa 6" in nombres
    assert "Empresa 0" not in nombres
