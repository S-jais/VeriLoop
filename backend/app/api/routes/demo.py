"""
Demo routes — seed data and reset functionality.
"""

import uuid
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.database import get_db
from app.db.models import Agent, AgentVersion, AgentStatus, EvaluationRun, Failure, TestSuite, TestCase, TestResult, EvidenceItem, Experiment, Intervention

router = APIRouter()
logger = logging.getLogger(__name__)

DEMO_AGENT_ID = "demo-customer-support-agent-v1"
DEMO_BASELINE_VERSION_ID = "demo-agent-baseline-v1"


async def seed_demo_data(db: AsyncSession):
    """Seed the demo agent if it doesn't exist."""
    existing = await db.get(Agent, DEMO_AGENT_ID)
    if existing:
        logger.info("Demo agent already exists, skipping seed")
        return

    logger.info("Seeding demo agent...")
    agent = Agent(
        id=DEMO_AGENT_ID,
        name="Demo Customer Support Agent",
        description=(
            "A demonstration customer support agent for ShopEase e-commerce. "
            "Contains deliberate policy weaknesses for VeriLoop demonstration: "
            "outdated policy retrieval, missing evidence checks, incorrect high-value handling, "
            "and prompt injection vulnerability."
        ),
        adapter_type="demo_customer_support",
        is_demo=True,
    )
    db.add(agent)

    baseline = AgentVersion(
        id=DEMO_BASELINE_VERSION_ID,
        agent_id=DEMO_AGENT_ID,
        version="v1.0",
        status=AgentStatus.ACTIVE,
        config={},
        is_baseline=True,
        notes="Initial baseline with known weaknesses (outdated policy, no evidence checks)",
    )
    db.add(baseline)
    await db.commit()
    logger.info("Demo agent seeded successfully")


@router.get("/status")
async def demo_status(db: AsyncSession = Depends(get_db)):
    """Get demo agent status."""
    agent = await db.get(Agent, DEMO_AGENT_ID)
    version = await db.get(AgentVersion, DEMO_BASELINE_VERSION_ID)

    # Get latest evaluation
    result = await db.execute(
        select(EvaluationRun)
        .where(EvaluationRun.agent_id == DEMO_AGENT_ID)
        .order_by(EvaluationRun.created_at.desc())
        .limit(1)
    )
    latest_eval = result.scalar_one_or_none()

    return {
        "agent_id": DEMO_AGENT_ID,
        "baseline_version_id": DEMO_BASELINE_VERSION_ID,
        "agent_exists": agent is not None,
        "latest_evaluation": {
            "id": latest_eval.id if latest_eval else None,
            "status": (latest_eval.status.value if hasattr(latest_eval.status, "value") else latest_eval.status) if latest_eval else None,
            "reliability_score": latest_eval.reliability_score if latest_eval else None,
            "task_success_score": latest_eval.task_success_score if latest_eval else None,
            "grounding_score": latest_eval.grounding_score if latest_eval else None,
            "tool_correctness_score": latest_eval.tool_correctness_score if latest_eval else None,
            "policy_compliance_score": latest_eval.policy_compliance_score if latest_eval else None,
            "safety_score": latest_eval.safety_score if latest_eval else None,
            "context_handling_score": latest_eval.context_handling_score if latest_eval else None,
            "total_tests": latest_eval.total_tests if latest_eval else None,
            "passed_tests": latest_eval.passed_tests if latest_eval else None,
            "failed_tests": latest_eval.failed_tests if latest_eval else None,
            "critical_failures": latest_eval.critical_failures if latest_eval else None,
        } if latest_eval else None,
    }


@router.post("/reset")
async def reset_demo(db: AsyncSession = Depends(get_db)):
    """
    Reset the demo to its initial state.
    Removes all evaluations, failures, and experiments for the demo agent.
    The baseline agent config is preserved.
    """
    # Delete in dependency order
    # First get all evaluation IDs for this agent
    eval_result = await db.execute(
        select(EvaluationRun.id).where(EvaluationRun.agent_id == DEMO_AGENT_ID)
    )
    eval_ids = [row[0] for row in eval_result.fetchall()]

    if eval_ids:
        # Delete test results
        for eval_id in eval_ids:
            await db.execute(delete(TestResult).where(TestResult.evaluation_id == eval_id))

        # Delete failures and their evidence
        failure_result = await db.execute(
            select(Failure.id).where(Failure.evaluation_id.in_(eval_ids))
        )
        failure_ids = [row[0] for row in failure_result.fetchall()]
        if failure_ids:
            await db.execute(delete(EvidenceItem).where(EvidenceItem.failure_id.in_(failure_ids)))
            # Get interventions for these failures
            interv_result = await db.execute(
                select(Intervention.id).where(Intervention.failure_id.in_(failure_ids))
            )
            interv_ids = [row[0] for row in interv_result.fetchall()]
            if interv_ids:
                await db.execute(delete(Experiment).where(Experiment.intervention_id.in_(interv_ids)))
                await db.execute(delete(Intervention).where(Intervention.id.in_(interv_ids)))
            await db.execute(delete(Failure).where(Failure.id.in_(failure_ids)))

        await db.execute(delete(EvaluationRun).where(EvaluationRun.id.in_(eval_ids)))

    # Delete test suites for demo agent
    suite_result = await db.execute(
        select(TestSuite.id).where(TestSuite.agent_id == DEMO_AGENT_ID)
    )
    suite_ids = [row[0] for row in suite_result.fetchall()]
    if suite_ids:
        await db.execute(delete(TestCase).where(TestCase.suite_id.in_(suite_ids)))
        await db.execute(delete(TestSuite).where(TestSuite.id.in_(suite_ids)))

    # Remove candidate versions (keep baseline)
    await db.execute(
        delete(AgentVersion)
        .where(AgentVersion.agent_id == DEMO_AGENT_ID)
        .where(AgentVersion.id != DEMO_BASELINE_VERSION_ID)
    )

    # Reset baseline to initial state
    baseline = await db.get(AgentVersion, DEMO_BASELINE_VERSION_ID)
    if baseline:
        baseline.status = AgentStatus.ACTIVE
        baseline.config = {}

    await db.commit()

    return {
        "status": "reset",
        "message": "Demo reset to baseline state. The flawed agent is ready for evaluation.",
        "agent_id": DEMO_AGENT_ID,
        "baseline_version_id": DEMO_BASELINE_VERSION_ID,
    }
