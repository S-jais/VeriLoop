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
    nebius_base_url: str = "https://api.tokenfactory.us-central1.nebius.com/v1"
    nebius_primary_model: str = "nvidia/Nemotron-3_5-Lightning"
    nebius_fast_model: str = "nvidia/Nemotron-3_5-Lightning"

    # Specific pipeline job mappings
    probe_model: str = "nvidia/Nemotron-3_5-Lightning"
    diagnosis_model: str = "nvidia/Nemotron-3_5-Lightning"
    judge_model: str = "nvidia/Nemotron-3_5-Lightning"

    # Safety limits and token caps
    max_tokens_per_call: int = 4096
    global_daily_budget_usd: float = 10.0
    rate_limit_per_minute: int = 20

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
