from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.core.config import get_settings
from src.core.logging import configure_logging
from src.core.rate_limit import limiter
from src.presentation.routes import (
    auth,
    dashboard,
    empresas,
    reference_tables,
    tenant_clientes,
    tenant_dashboard,
    tenant_empresa,
    tenant_facturas,
    tenant_impuestos,
    tenant_productos,
    tenant_resolucion,
    usuarios_admin,
    webhooks,
)

settings = get_settings()
configure_logging(settings.log_level)

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
app.include_router(empresas.router)
app.include_router(dashboard.router)
app.include_router(usuarios_admin.router)
app.include_router(reference_tables.public_router)
app.include_router(reference_tables.admin_router)
app.include_router(tenant_empresa.router)
app.include_router(tenant_dashboard.router)
app.include_router(tenant_resolucion.router)
app.include_router(tenant_clientes.router)
app.include_router(tenant_productos.router)
app.include_router(tenant_impuestos.router)
app.include_router(tenant_facturas.router)
app.include_router(webhooks.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ingefact-api", "alegra_env": settings.alegra_env}
