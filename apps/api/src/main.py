from fastapi import FastAPI

from src.core.config import get_settings
from src.core.logging import configure_logging
from src.presentation.routes import auth, empresas, webhooks

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="IngeFact API", version="0.1.0")

app.include_router(auth.router)
app.include_router(empresas.router)
app.include_router(webhooks.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ingefact-api", "alegra_env": settings.alegra_env}
