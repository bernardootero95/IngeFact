from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import get_settings
from src.core.logging import configure_logging
from src.presentation.routes import auth, dashboard, empresas, webhooks

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="IngeFact API", version="0.1.0")

# apps/admin y apps/user corren en Vite (puerto variable, ej. 5173/5174) --
# se permite cualquier origin localhost en vez de fijar un puerto.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(empresas.router)
app.include_router(dashboard.router)
app.include_router(webhooks.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ingefact-api", "alegra_env": settings.alegra_env}
