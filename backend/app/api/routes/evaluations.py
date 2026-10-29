"""
Evaluations API routes — includes SSE streaming for real-time progress.
"""

import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db, AsyncSessionLocal
from app.db.models import Agent, AgentVersion, EvaluationRun, AgentStatus
from app.services.orchestrator import EvaluationOrchestrator

router = APIRouter()


class RunEvaluationRequest(BaseModel):
    agent_id: Optional[str] = "demo-customer-support-agent-v1"
    agent_version_id: Optional[str] = None
    version: Optional[str] = None  # alias for agent_version_id
    suite_id: Optional[str] = None


@router.post("")
@router.post("/")
@router.post("/run")
async def start_evaluation(req: RunEvaluationRequest):
    """Start an evaluation and stream real-time progress via SSE."""
    target_agent_id = req.agent_id
    if target_agent_id in ("agent-cs-01", "default", "demo"):
        target_agent_id = "demo-customer-support-agent-v1"

    target_version_id = req.agent_version_id or req.version

    async with AsyncSessionLocal() as session:
        agent = None
        if target_agent_id:
            agent = await session.get(Agent, target_agent_id)
        if not agent:
            # Fallback to the most recent registered agent
            agent_res = await session.execute(select(Agent).order_by(Agent.created_at.desc()).limit(1))
            agent = agent_res.scalar_one_or_none()
            if not agent:
                raise HTTPException(404, "No agent found. Please register an agent first.")
            target_agent_id = agent.id

        # Look up version belonging to this specific agent
        version = None
        if target_version_id and target_version_id not in ("v1.0", "baseline", "demo", "demo-agent-baseline-v1"):
            v_check = await session.get(AgentVersion, target_version_id)
            if v_check and v_check.agent_id == target_agent_id:
                version = v_check

        if not version:
            # Get latest version for this specific agent
            ver_res = await session.execute(
                select(AgentVersion)
                .where(AgentVersion.agent_id == target_agent_id)
                .order_by(AgentVersion.created_at.desc())
                .limit(1)
            )
            version = ver_res.scalar_one_or_none()
            if not version:
                version = AgentVersion(
                    id=str(uuid.uuid4()),
                    agent_id=target_agent_id,
                    version="Baseline v1.0",
                    status=AgentStatus.ACTIVE,
                    config={
                        "endpoint_url": agent.endpoint_url,
                        "http_method": agent.http_method,
                        "adapter_type": agent.adapter_type,
                    },
                    is_baseline=True,
                )
                session.add(version)
                await session.commit()
            target_version_id = version.id
        else:
            target_version_id = version.id

    async def event_generator():
        async with AsyncSessionLocal() as session:
            orch = EvaluationOrchestrator(session)
            async for event in orch.run_full_evaluation(
                agent_id=target_agent_id,
                agent_version_id=target_version_id,
                existing_suite_id=req.suite_id,
            ):
                yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("")
async def list_evaluations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EvaluationRun).order_by(EvaluationRun.created_at.desc()).limit(20)
    )
    evals = result.scalars().all()
    return [_format_eval(e) for e in evals]


@router.get("/{eval_id}")
async def get_evaluation(eval_id: str, db: AsyncSession = Depends(get_db)):
    ev = await db.get(EvaluationRun, eval_id)
    if not ev:
        raise HTTPException(404, "Evaluation not found")
    return _format_eval(ev)


def _format_eval(e: EvaluationRun) -> dict:
    return {
        "id": e.id,
        "agent_id": e.agent_id,
        "agent_version_id": e.agent_version_id,
        "suite_id": e.suite_id,
        "status": e.status.value if hasattr(e.status, "value") else e.status,
        "reliability_score": e.reliability_score,
        "task_success_score": e.task_success_score,
        "grounding_score": e.grounding_score,
        "tool_correctness_score": e.tool_correctness_score,
        "policy_compliance_score": e.policy_compliance_score,
        "safety_score": e.safety_score,
        "context_handling_score": e.context_handling_score,
        "total_tests": e.total_tests,
        "passed_tests": e.passed_tests,
        "failed_tests": e.failed_tests,
        "critical_failures": e.critical_failures,
        "model_used": e.model_used,
        "started_at": e.started_at.isoformat() if e.started_at else None,
        "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
