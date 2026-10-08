"""
VeriLoop Backend Configuration
Validates required environment variables at startup.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # ─── Nebius Token Factory ─────────────────────────────────────────────────
    nebius_api_key: str = ""
    nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1"
    nebius_primary_model: str = "nvidia/llama-3.1-nemotron-70b-instruct"
    nebius_fast_model: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"

    # ─── Tavily ───────────────────────────────────────────────────────────────
    tavily_api_key: str = ""

    # ─── Database ─────────────────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./veriloop.db"

    # ─── App ──────────────────────────────────────────────────────────────────
    app_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    log_level: str = "INFO"
    demo_mode: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def validate_required(self) -> list[str]:
        """Returns list of missing required configuration items."""
        errors = []
        if not self.nebius_api_key:
            errors.append("NEBIUS_API_KEY is required for AI inference")
        if not self.tavily_api_key:
            errors.append("TAVILY_API_KEY is required for evidence research (optional but recommended)")
        return errors

    def is_nebius_configured(self) -> bool:
        return bool(self.nebius_api_key)

    def is_tavily_configured(self) -> bool:
        return bool(self.tavily_api_key)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
