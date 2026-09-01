from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    environment: str = "development"
    alegra_env: str = "sandbox"
    alegra_base_url: str
    alegra_token: str
    credentials_encryption_key: str = ""
    jwt_secret: str
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
