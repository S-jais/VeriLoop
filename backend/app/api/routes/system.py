"""System information API."""

from fastapi import APIRouter
from app.core.config import get_settings
from app.core.nebius_provider import get_nebius_provider

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "nebius_configured": settings.is_nebius_configured(),
        "tavily_configured": settings.is_tavily_configured(),
    }


@router.get("/info")
async def system_info():
    return {
        "product": "VeriLoop",
        "tagline": "Autonomous Reliability Engineering for AI Agents",
        "version": "1.0.0",
        "stack": {
            "frontend": "Next.js + TypeScript + Tailwind CSS",
            "backend": "FastAPI + Python",
            "inference": {
                "provider": "Nebius Token Factory",
                "base_url": settings.nebius_base_url,
                "primary_model": settings.nebius_primary_model,
                "fast_model": settings.nebius_fast_model,
                "configured": settings.is_nebius_configured(),
            },
            "evidence": {
                "provider": "Tavily",
                "configured": settings.is_tavily_configured(),
            },
            "database": {
                "type": "SQLite (dev) / PostgreSQL (prod)",
                "url_type": settings.database_url.split(":")[0],
            },
        },
        "demo_mode": settings.demo_mode,
    }


@router.get("/models")
async def list_models():
    """Query Nebius Token Factory for available models."""
    if not settings.is_nebius_configured():
        return {
            "configured": False,
            "message": "NEBIUS_API_KEY not configured",
            "models": [],
        }
    provider = get_nebius_provider()
    models = await provider.list_models()
    return {
        "configured": True,
        "primary_model": settings.nebius_primary_model,
        "fast_model": settings.nebius_fast_model,
        "available_models": models,
    }
