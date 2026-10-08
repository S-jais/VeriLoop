"""
Agents API routes.
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import Agent, AgentVersion, AgentStatus

router = APIRouter()


class CreateAgentRequest(BaseModel):
    name: str
    description: str = ""
    adapter_type: str = "demo_customer_support"
    is_demo: bool = False


class AgentVersionRequest(BaseModel):
    version: str
    config: dict = {}
    notes: str = ""


@router.post("")
async def create_agent(req: CreateAgentRequest, db: AsyncSession = Depends(get_db)):
    agent = Agent(
        id=str(uuid.uuid4()),
        name=req.name,
        description=req.description,
        adapter_type=req.adapter_type,
        is_demo=req.is_demo,
    )
    db.add(agent)
    # Create baseline v1.0
    version = AgentVersion(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        version="v1.0",
        status=AgentStatus.ACTIVE,
        config={},
        is_baseline=True,
    )
    db.add(version)
    await db.commit()
    return {"id": agent.id, "version_id": version.id, "name": agent.name}


@router.get("")
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent))
    agents = result.scalars().all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "adapter_type": a.adapter_type,
            "is_demo": a.is_demo,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in agents
    ]


@router.get("/{agent_id}")
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    result = await db.execute(
        select(AgentVersion).where(AgentVersion.agent_id == agent_id)
    )
    versions = result.scalars().all()

    return {
        "id": agent.id,
        "name": agent.name,
        "description": agent.description,
        "adapter_type": agent.adapter_type,
        "is_demo": agent.is_demo,
        "versions": [
            {
                "id": v.id,
                "version": v.version,
                "status": v.status.value if hasattr(v.status, "value") else v.status,
                "is_baseline": v.is_baseline,
                "config": v.config,
                "notes": v.notes,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
    }


@router.post("/{agent_id}/versions")
async def create_version(agent_id: str, req: AgentVersionRequest, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    version = AgentVersion(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        version=req.version,
        status=AgentStatus.CANDIDATE,
        config=req.config,
        is_baseline=False,
        notes=req.notes,
    )
    db.add(version)
    await db.commit()
    return {"id": version.id, "version": version.version, "status": "candidate"}
