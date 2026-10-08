"""
FastAPI main application — VeriLoop backend.
"""

import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.db.database import init_db
from app.api.routes import agents, evaluations, failures, experiments, evidence, system, demo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("VeriLoop backend starting up...")

    # Validate configuration
    config_errors = settings.validate_required()
    for error in config_errors:
        logger.warning("Configuration warning: %s", error)

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    # Seed demo data
    from app.api.routes.demo import seed_demo_data
    from app.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await seed_demo_data(db)

    logger.info(
        "VeriLoop ready — Nebius configured: %s, Tavily configured: %s",
        settings.is_nebius_configured(),
        settings.is_tavily_configured(),
    )

    yield
    logger.info("VeriLoop backend shutting down")


app = FastAPI(
    title="VeriLoop",
    description="Autonomous Reliability Engineering for AI Agents",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["Evaluations"])
app.include_router(failures.router, prefix="/api/failures", tags=["Failures"])
app.include_router(experiments.router, prefix="/api/experiments", tags=["Experiments"])
app.include_router(evidence.router, prefix="/api/evidence", tags=["Evidence"])
app.include_router(system.router, prefix="/api/system", tags=["System"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])



@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "Check server logs for details"},
    )
