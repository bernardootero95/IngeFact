from fastapi import FastAPI

from src.core.config import get_settings
from src.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="IngeFact API", version="0.1.0")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ingefact-api", "alegra_env": settings.alegra_env}
