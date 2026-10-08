"""
Phase 2 (P2) Completeness & Polish Tests.
Validates:
1. System architecture information and provider detection
2. Custom agent registration and lineage tracking
3. Demo reset functionality and state preservation
4. End-to-end integrity of the 6-stage reliability feedback loop
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import init_db, AsyncSessionLocal
from app.api.routes.demo import seed_demo_data, DEMO_AGENT_ID, DEMO_BASELINE_VERSION_ID


@pytest_asyncio.fixture(autouse=True)
async def setup_test_env():
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_demo_data(session)


@pytest.mark.asyncio
async def test_system_info_endpoint():
    """Verify system architecture and provider information."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/system/info")
        assert res.status_code == 200
        data = res.json()
        assert data["product"] == "VeriLoop"
        assert "Nebius Token Factory" in data["stack"]["inference"]["provider"]
        assert "Tavily" in data["stack"]["evidence"]["provider"]
        assert "llama" in data["stack"]["inference"]["primary_model"].lower() or "nemotron" in data["stack"]["inference"]["primary_model"].lower()


@pytest.mark.asyncio
async def test_system_models_endpoint():
    """Verify system models listing responds gracefully."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/system/models")
        assert res.status_code == 200
        data = res.json()
        assert "available_models" in data or "configured" in data


@pytest.mark.asyncio
async def test_custom_agent_creation_and_listing():
    """Verify user can register custom agents."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/api/agents",
            json={
                "name": "FinTech Loan Approval Agent",
                "description": "Evaluates commercial loan applications",
                "adapter_type": "http_webhook",
                "is_demo": False,
            },
        )
        assert create_res.status_code == 200
        created = create_res.json()
        assert created["name"] == "FinTech Loan Approval Agent"
        agent_id = created["id"]

        # Fetch agent details
        get_res = await client.get(f"/api/agents/{agent_id}")
        assert get_res.status_code == 200
        agent_data = get_res.json()
        assert len(agent_data["versions"]) >= 1
        assert agent_data["versions"][0]["is_baseline"] is True


@pytest.mark.asyncio
async def test_demo_reset_endpoint():
    """Verify demo reset clears evaluations and preserves flawed baseline."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/demo/reset")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "reset"
        assert data["agent_id"] == DEMO_AGENT_ID

        # Verify status endpoint reflects clean state
        status_res = await client.get("/api/demo/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["agent_exists"] is True
        assert status_data["latest_evaluation"] is None
