from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    database_url: str
    environment: str = "development"
    alegra_env: str = "sandbox"
    alegra_base_url: str
    alegra_token: str
    jwt_secret: str
    log_level: str = "INFO"
    # apps/admin y apps/user corren en Vite con puerto variable en dev (ej.
    # 5173/5174) -- en production, fijar el(los) origin(es) reales via env var.
    cors_allow_origin_regex: str = r"http://localhost:\d+"

    # Resend (https://resend.com) -- proveedor de correo transaccional.
    resend_api_key: str = ""
    email_from: str = "IngeFact <notificaciones@ingefact.com>"
    # URLs base de apps/user y apps/admin, usadas para armar links de
    # login/reset dentro de los correos (ej. {user_app_url}/reset-password?token=...).
    user_app_url: str = "http://localhost:3001"
    admin_app_url: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
