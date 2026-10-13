"""
Failures API routes — Includes Failure Diagnosis, Failure Replay Engine, and Failure Genome Clustering.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.db.models import (
    Failure, EvidenceItem, TestResult, TestCase, EvaluationRun, Agent, AgentVersion,
    FailureReplay, FailureCluster, FailureCategory, FailureSeverity, TestSplit, TestSuite
)
from app.services.evaluation_engine import EvaluationEngine

router = APIRouter()


class ReplayFailureRequest(BaseModel):
    target_version_id: Optional[str] = None
    target_version_name: Optional[str] = "Baseline v1.0"
    config_override: Optional[Dict[str, Any]] = None
    save_as_regression_test: bool = False


@router.get("")
async def list_failures(eval_id: str | None = None, db: AsyncSession = Depends(get_db)):
    """List diagnosed failures with test input and response details."""
    query = select(Failure).order_by(Failure.created_at.desc()).limit(50)
    if eval_id:
        query = query.where(Failure.evaluation_id == eval_id)
    result = await db.execute(query)
    failures = result.scalars().all()

    formatted = []
    for f in failures:
        item = _format_failure(f)
        if f.test_result_id:
            tr = await db.get(TestResult, f.test_result_id)
            if tr:
                tc = await db.get(TestCase, tr.test_case_id)
                item["test_input"] = tc.input if tc else None
                item["agent_response"] = tr.agent_response
                item["tool_calls"] = tr.tool_calls or []
        formatted.append(item)
    return formatted


@router.get("/genome")
async def get_failure_genome(db: AsyncSession = Depends(get_db)):
    """
    Returns Failure Genome clusters grouping recurring failure modes across agents and splits.
    Includes recurrence frequency, affected agents, shared evidence, and recommended remediations.
    """
    clusters_res = await db.execute(select(FailureCluster).order_by(FailureCluster.failure_count.desc()))
    clusters = clusters_res.scalars().all()

    if not clusters:
        # Seed canonical failure genome clusters if table is empty
        canonical_clusters = [
            FailureCluster(
                id="cluster-ret-stale",
                name="Stale Vector Index Retrieval Cluster",
                category=FailureCategory.RETRIEVAL_FAILURE,
                severity=FailureSeverity.HIGH,
                description="Vector retrieval pulls deprecated policy chunk instead of active 2026 guidelines.",
                failure_count=4,
                recurrence_rate=0.28,
                affected_agents=["ShopEase Customer Support Agent", "Returns Assistant"],
                common_evidence="ShopEase Master Return & Refund Policy 2026 (Sec 4.2: 30-day window)",
                recommended_remediation="RETRIEVAL + PROMPT: Hybrid recency re-ranking + Tavily grounding verification",
                remediation_validated=True,
            ),
            FailureCluster(
                id="cluster-pol-fraud",
                name="Unbounded Fraud Payout Policy Breach",
                category=FailureCategory.POLICY_FAILURE,
                severity=FailureSeverity.CRITICAL,
                description="High-value claims ($200+) approved automatically without mandatory photo evidence or managerial authorization.",
                failure_count=3,
                recurrence_rate=0.21,
                affected_agents=["ShopEase Customer Support Agent", "Claims Bot"],
                common_evidence="E-Commerce High-Value Damage Threshold Standard (Sec 2.1)",
                recommended_remediation="GUARDRAIL + WORKFLOW: Hard supervisor gating on payouts > $200",
                remediation_validated=True,
            ),
            FailureCluster(
                id="cluster-saf-injection",
                name="Instruction Boundary Delimiter Escape",
                category=FailureCategory.SAFETY_FAILURE,
                severity=FailureSeverity.CRITICAL,
                description="System override attack payload escapes conversation framing and leaks internal authorization coupon code.",
                failure_count=2,
                recurrence_rate=0.14,
                affected_agents=["ShopEase Customer Support Agent"],
                common_evidence="OWASP LLM01: Prompt Injection Defense and Delimiter Specifications",
                recommended_remediation="PROMPT + GUARDRAIL: Strict XML data boundaries <user_query> with refusal rule",
                remediation_validated=True,
            ),
            FailureCluster(
                id="cluster-tol-schema",
                name="Alphanumeric String Parameter Schema Violation",
                category=FailureCategory.TOOL_FAILURE,
                severity=FailureSeverity.HIGH,
                description="Tool calling logic fails to coerce alphanumeric string order numbers into required integer parameters.",
                failure_count=3,
                recurrence_rate=0.21,
                affected_agents=["ShopEase Customer Support Agent", "Order Management Agent"],
                common_evidence="JSON Schema Numeric Coercion & Parameter Typing Standard",
                recommended_remediation="TOOL: Strict Pydantic JSON schema with regex numeric extraction",
                remediation_validated=True,
            ),
            FailureCluster(
                id="cluster-ctx-forgetting",
                name="Context State Loss in Multi-Turn Order Modification",
                category=FailureCategory.CONTEXT_FAILURE,
                severity=FailureSeverity.MEDIUM,
                description="Agent fails to preserve item IDs and customer delivery address across multi-turn amendment dialogues.",
                failure_count=2,
                recurrence_rate=0.16,
                affected_agents=["ShopEase Customer Support Agent"],
                common_evidence="Multi-Turn Dialogue State Tracking & Memory Buffer Best Practices",
                recommended_remediation="MEMORY: Structured scratchpad maintaining state machine checkpoints",
                remediation_validated=False,
            ),
        ]
        for c in canonical_clusters:
            db.add(c)
        await db.commit()

        clusters_res = await db.execute(select(FailureCluster).order_by(FailureCluster.failure_count.desc()))
        clusters = clusters_res.scalars().all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "category": c.category.value if hasattr(c.category, "value") else str(c.category),
            "severity": c.severity.value if hasattr(c.severity, "value") else str(c.severity),
            "description": c.description,
            "failure_count": c.failure_count,
            "recurrence_rate": c.recurrence_rate,
            "affected_agents": c.affected_agents or [],
            "common_evidence": c.common_evidence,
            "recommended_remediation": c.recommended_remediation,
            "remediation_validated": c.remediation_validated,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in clusters
    ]


@router.get("/{failure_id}")
async def get_failure(failure_id: str, db: AsyncSession = Depends(get_db)):
    """Get single failure with causal DAG, multi-turn trace, and evidence citations."""
    failure = await db.get(Failure, failure_id)
    if not failure:
        raise HTTPException(404, f"Failure {failure_id} not found")

    test_result = None
    test_input = None
    test_case_id = None
    if failure.test_result_id:
        test_result = await db.get(TestResult, failure.test_result_id)
        if test_result:
            test_case_id = test_result.test_case_id
            test_case = await db.get(TestCase, test_result.test_case_id)
            test_input = test_case.input if test_case else None

    # Load evidence
    ev_result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.failure_id == failure_id)
    )
    evidence = ev_result.scalars().all()

    # Load replay history
    replays_res = await db.execute(
        select(FailureReplay).where(FailureReplay.failure_id == failure_id).order_by(FailureReplay.created_at.desc())
    )
    replays = replays_res.scalars().all()

    return {
        **_format_failure(failure),
        "test_case_id": test_case_id,
        "test_input": test_input,
        "agent_response": test_result.agent_response if test_result else None,
        "tool_calls": test_result.tool_calls if test_result else [],
        "retrieved_context": test_result.retrieved_context if test_result else [],
        "trace": test_result.trace if test_result else {},
        "scores": test_result.scores if test_result else {},
        "evidence": [
            {
                "id": e.id,
                "query": e.query,
                "source_url": e.source_url,
                "source_title": e.source_title,
                "content_summary": e.content_summary,
                "retrieved_at": e.retrieved_at.isoformat() if e.retrieved_at else None,
                "reason_for_research": e.reason_for_research,
            }
            for e in evidence
        ],
        "replays": [
            {
                "id": r.id,
                "target_version": r.target_version,
                "replayed_output": r.replayed_output,
                "passed": r.passed,
                "replayed_score": r.replayed_score,
                "latency_ms": r.latency_ms,
                "saved_as_regression_test": r.saved_as_regression_test,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in replays
        ],
    }


@router.post("/{failure_id}/replay")
async def replay_failure(
    failure_id: str,
    req: ReplayFailureRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes Failure Replay: re-runs the failed test against the specified version or configuration patch.
    Returns side-by-side comparison of original vs replayed output, score delta, and latency.
    """
    failure = await db.get(Failure, failure_id)
    if not failure:
        raise HTTPException(404, f"Failure {failure_id} not found")

    test_case = None
    original_response = failure.observed_behavior
    test_result = None

    if failure.test_result_id:
        test_result = await db.get(TestResult, failure.test_result_id)
        if test_result:
            test_case = await db.get(TestCase, test_result.test_case_id)
            original_response = test_result.agent_response

    if not test_case:
        # Fallback synthetic test case from failure record
        test_case = TestCase(
            id=str(uuid.uuid4()),
            suite_id="demo-suite-baseline-100",
            category=failure.category.value if hasattr(failure.category, "value") else str(failure.category),
            severity=failure.severity,
            input=failure.expected_behavior or "Customer asks policy inquiry",
            expected_behavior=failure.expected_behavior or "Adhere to active 2026 policy",
            evaluation_criteria=["Adheres to policy", "Grounded facts"],
            split=TestSplit.OPTIMIZATION,
        )

    # Determine agent configuration for replay
    eval_run = await db.get(EvaluationRun, failure.evaluation_id)
    agent_id = eval_run.agent_id if eval_run else "demo-customer-support-agent-v1"
    agent = await db.get(Agent, agent_id)

    replay_config = {}
    if req.config_override:
        replay_config.update(req.config_override)
    elif req.target_version_id:
        ver = await db.get(AgentVersion, req.target_version_id)
        if ver and ver.config:
            replay_config.update(ver.config)

    # Execute test with evaluation engine
    engine = EvaluationEngine()
    exec_result = await engine.execute_test(
        test_case={
            "id": test_case.id,
            "input": test_case.input,
            "expected_behavior": test_case.expected_behavior,
            "evaluation_criteria": test_case.evaluation_criteria or [],
            "category": test_case.category,
            "severity": test_case.severity.value if hasattr(test_case.severity, "value") else str(test_case.severity),
        },
        adapter_type=agent.adapter_type if agent else "demo_customer_support",
        agent_config=replay_config,
    )

    replayed_score = sum(exec_result.scores.values()) / max(len(exec_result.scores), 1)

    # Save replay record
    replay_record = FailureReplay(
        id=str(uuid.uuid4()),
        failure_id=failure_id,
        test_case_id=test_case.id,
        agent_id=agent_id,
        target_version=req.target_version_name or "Replayed candidate",
        original_input=test_case.input,
        original_output=original_response,
        replayed_output=exec_result.agent_response,
        passed=exec_result.passed,
        original_score=0.20,
        replayed_score=round(replayed_score, 2),
        latency_ms=exec_result.latency_ms,
        tool_calls=exec_result.tool_calls or [],
        evaluator_notes=exec_result.evaluator_notes,
        saved_as_regression_test=req.save_as_regression_test,
    )
    db.add(replay_record)

    # If requested to save as permanent regression test, attach to agent test suite
    if req.save_as_regression_test and test_case.id:
        # Create regression test case in holdout split
        suite_res = await db.execute(select(TestSuite).where(TestSuite.agent_id == agent_id).limit(1))
        suite = suite_res.scalar_one_or_none()
        if suite:
            reg_tc = TestCase(
                id=str(uuid.uuid4()),
                suite_id=suite.id,
                category=test_case.category,
                severity=FailureSeverity.CRITICAL,
                input=test_case.input,
                expected_behavior=test_case.expected_behavior,
                evaluation_criteria=["Zero critical regressions permitted", "Verified fix holds"],
                split=TestSplit.HOLDOUT,
                source=["FAILURE_REPLAY_SAVED"],
            )
            db.add(reg_tc)

    await db.commit()

    return {
        "replay_id": replay_record.id,
        "failure_id": failure_id,
        "target_version": replay_record.target_version,
        "passed": exec_result.passed,
        "original_output": original_response,
        "replayed_output": exec_result.agent_response,
        "score_delta": round(replayed_score - 0.20, 2),
        "latency_ms": exec_result.latency_ms,
        "tool_calls": exec_result.tool_calls or [],
        "notes": exec_result.evaluator_notes,
        "saved_as_regression_test": req.save_as_regression_test,
    }


def _format_failure(f: Failure) -> dict:
    return {
        "id": f.id,
        "evaluation_id": f.evaluation_id,
        "test_result_id": f.test_result_id,
        "category": f.category.value if hasattr(f.category, "value") else str(f.category),
        "severity": f.severity.value if hasattr(f.severity, "value") else str(f.severity),
        "expected_behavior": f.expected_behavior,
        "observed_behavior": f.observed_behavior,
        "root_cause_hypothesis": f.root_cause_hypothesis,
        "root_cause_confidence": f.root_cause_confidence,
        "evidence_needed": f.evidence_needed,
        "recommended_interventions": f.recommended_interventions,
        "causal_graph": f.causal_graph,
        "status": f.status,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }
