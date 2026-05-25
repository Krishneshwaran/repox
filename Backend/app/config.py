from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    github_client_id: str = Field(default="", alias="GITHUB_CLIENT_ID")
    github_client_secret: str = Field(default="", alias="GITHUB_CLIENT_SECRET")
    github_callback_url: str = Field(
        default="http://localhost:8000/auth/github/callback",
        alias="GITHUB_CALLBACK_URL",
    )
    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")
    frontend_origin: str = Field(default="http://localhost:5173", alias="FRONTEND_ORIGIN")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
