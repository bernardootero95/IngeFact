from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.core.config import get_settings
from src.core.logging import configure_logging
from src.core.monitoring import configure_error_monitoring
from src.core.rate_limit import limiter
from src.presentation.dependencias_plan import bloquear_escritura_con_plan_vencido
from src.presentation.routes import (
    admin_api_keys,
    auth,
    configuracion,
    dashboard,
    empresas,
    external_clientes,
    external_facturas,
    external_productos,
    reference_tables,
    tenant_clientes,
    tenant_dashboard,
    tenant_documentos_soporte,
    tenant_empleados,
    tenant_empresa,
    tenant_exportacion,
    tenant_facturas,
    tenant_facturas_recibidas,
    tenant_habilitacion,
    tenant_impuestos,
    tenant_nomina,
    tenant_notas_credito,
    tenant_notas_debito,
    tenant_productos,
    tenant_proveedores,
    tenant_resolucion,
    tenant_resolucion_documento_soporte,
    usuarios_admin,
    webhooks,
)

settings = get_settings()
configure_logging(settings.log_level)
configure_error_monitoring(settings)

app = FastAPI(title="IngeFact API", version="0.1.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configurable via CORS_ALLOW_ORIGIN_REGEX -- en dev, cualquier origin
# localhost (apps/admin y apps/user corren en Vite con puerto variable); en
# production debe fijarse a los dominios reales del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin_api_keys.router)
app.include_router(empresas.router)
app.include_router(dashboard.router)
app.include_router(configuracion.router)
app.include_router(usuarios_admin.router)
app.include_router(reference_tables.public_router)
app.include_router(reference_tables.admin_router)
# Con el plan vencido el tenant solo puede leer (ver dependencias_plan).
PLAN_NO_VENCIDO = [Depends(bloquear_escritura_con_plan_vencido)]
app.include_router(tenant_empresa.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_exportacion.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_dashboard.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_habilitacion.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_resolucion.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_resolucion_documento_soporte.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_clientes.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_proveedores.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_empleados.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_documentos_soporte.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_productos.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_impuestos.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_facturas.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_facturas_recibidas.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_notas_credito.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_notas_debito.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(tenant_nomina.router, dependencies=PLAN_NO_VENCIDO)
app.include_router(external_clientes.router)
app.include_router(external_productos.router)
app.include_router(external_facturas.router)
app.include_router(webhooks.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ingefact-api", "alegra_env": settings.alegra_env}
