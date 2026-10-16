from src.application.configuracion_service import ConfiguracionService
from src.core.config import get_settings
from src.domain.configuracion import ConfiguracionNegocioRequest


def test_obtener_sin_fila_usa_los_valores_de_settings(db_session):
    config = ConfiguracionService(db_session).obtener()

    assert config["trm_usd_cop"] == get_settings().trm_usd_cop


def test_guardar_actualiza_la_misma_fila(db_session):
    service = ConfiguracionService(db_session)
    service.guardar(ConfiguracionNegocioRequest(costo_servidor_usd=8, trm_usd_cop=3100, comision_paquetes_pct=10))
    resultado = service.guardar(
        ConfiguracionNegocioRequest(costo_servidor_usd=8, trm_usd_cop=3300, comision_paquetes_pct=10)
    )

    assert resultado["trm_usd_cop"] == 3300


def test_la_ruta_exige_ser_admin(api_client):
    assert api_client.get("/api/v1/admin/configuracion").status_code in (401, 403)
