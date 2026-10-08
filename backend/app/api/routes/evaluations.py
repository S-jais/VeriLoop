"""
Evaluations API routes — includes SSE streaming for real-time progress.
"""

import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db, AsyncSessionLocal
from app.db.models import Agent, AgentVersion, EvaluationRun
from app.services.orchestrator import EvaluationOrchestrator

router = APIRouter()


class RunEvaluationRequest(BaseModel):
    agent_id: str
    agent_version_id: str
    suite_id: str | None = None


@router.post("")
async def start_evaluation(req: RunEvaluationRequest):
    """Start an evaluation and stream real-time progress via SSE."""

    async with AsyncSessionLocal() as session:
        agent = await session.get(Agent, req.agent_id)
        if not agent:
            raise HTTPException(404, f"Agent {req.agent_id} not found")

        version = await session.get(AgentVersion, req.agent_version_id)
        if not version:
            raise HTTPException(404, f"Version {req.agent_version_id} not found")

    async def event_generator():
        async with AsyncSessionLocal() as session:
            orch = EvaluationOrchestrator(session)
            async for event in orch.run_full_evaluation(
                agent_id=req.agent_id,
                agent_version_id=req.agent_version_id,
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
