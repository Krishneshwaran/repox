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
    session_store_path: str = Field(default=".session_store.json", alias="SESSION_STORE_PATH")

    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="openai/gpt-4o-mini", alias="OPENROUTER_MODEL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
