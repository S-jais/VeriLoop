"""
Database setup using SQLAlchemy async with SQLite (dev) / PostgreSQL (prod).
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)

settings = get_settings()


class Base(DeclarativeBase):
    pass


from sqlalchemy import text

connect_args = {"timeout": 60} if "sqlite" in settings.database_url else {}

engine = create_async_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables and configure SQLite pragmas."""
    async with engine.begin() as conn:
        if "sqlite" in settings.database_url:
            await conn.execute(text("PRAGMA journal_mode=WAL"))
            await conn.execute(text("PRAGMA busy_timeout=60000"))
        await conn.run_sync(Base.metadata.create_all)

        # Defensive column migrations for existing SQLite databases
        if "sqlite" in settings.database_url:
            agent_cols = [
                ("connection_type", "VARCHAR DEFAULT 'demo'"),
                ("endpoint_url", "VARCHAR"),
                ("http_method", "VARCHAR DEFAULT 'POST'"),
                ("auth_type", "VARCHAR DEFAULT 'none'"),
                ("auth_header_name", "VARCHAR DEFAULT 'Authorization'"),
                ("auth_token_masked", "VARCHAR"),
                ("request_headers", "JSON"),
                ("request_body_template", "JSON"),
                ("input_path", "VARCHAR DEFAULT 'input'"),
                ("output_path", "VARCHAR DEFAULT 'response'"),
                ("timeout_seconds", "INTEGER DEFAULT 15"),
                ("retry_count", "INTEGER DEFAULT 2"),
                ("connection_status", "VARCHAR DEFAULT 'connected'"),
                ("last_tested_at", "DATETIME"),
                ("framework", "VARCHAR DEFAULT 'custom'"),
                ("repository_url", "VARCHAR"),
                ("repository_branch", "VARCHAR"),
                ("artifact_hash", "VARCHAR"),
                ("system_prompt", "TEXT"),
                ("tools_schema", "JSON"),
            ]
            for col_name, col_type in agent_cols:
                try:
                    await conn.execute(text(f"ALTER TABLE agents ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass  # column already exists or table freshly created
    logger.info("Database initialized successfully")
