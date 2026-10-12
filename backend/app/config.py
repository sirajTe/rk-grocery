from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "rketech"
    # Admin login. Change all three before deploying.
    admin_email: str = "rketech9896@gmail.com"
    admin_password: str = "Rketech@2026"
    secret_key: str = "dev-only-change-me"
    token_hours: int = 12
    # Comma-separated list of frontend origins allowed to call the API
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    upload_dir: str = "uploads"
    max_upload_mb: int = 5
    seed_on_startup: bool = True

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
