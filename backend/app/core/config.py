from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "QA Test Management API"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # Local-first default uses SQLite so the app runs without external DB setup.
    database_url: str = "sqlite:///./qa_local.db"

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    upload_dir: str = "uploads"
    max_upload_bytes: int = 50 * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
