from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
