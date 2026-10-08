"""
P1 Differentiation Tests for VeriLoop.
Tests:
1. Failure Causal Graph generation and structure
2. Intervention Engine planning targeted candidate modifications
3. Regression Firewall detection of score drops and critical failures
4. Full Experiment Lab flow across Optimization, Validation, and Held-out splits
5. Candidate promotion to verified baseline
"""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.db.database import Base
from app.db.models import (
    Agent, AgentVersion, AgentStatus, TestSuite, TestCase,
    EvaluationRun, TestResult, Failure, Intervention, Experiment,
    ExperimentStatus, TestSplit, FailureSeverity
)
from app.services.failure_analyzer import FailureAnalyzerService
from app.services.intervention_engine import InterventionPlannerService, RegressionFirewall
from app.services.evaluation_engine import EvaluationEngine
from app.api.routes.demo import seed_demo_data, DEMO_AGENT_ID, DEMO_BASELINE_VERSION_ID
from app.api.routes.experiments import run_experiment, RunExperimentRequest, promote_candidate


# ─── 1. Failure Causal Graph Test ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_failure_causal_graph_generation():
    """Verify failure analyzer generates multi-node causal graphs."""
    analyzer = FailureAnalyzerService()
    analysis, graph, is_live = await analyzer.analyze_failure(
        test_input="I want to return something I bought 35 days ago.",
        expected_behavior="Agent should inform that 90-day return window applies.",
        agent_response="Returns must be made within 30 days of purchase.",
        tool_calls=[{"tool": "check_policy", "result": "Return window: 30 days."}],
        retrieved_context=["[Policy] Return window: 30 days."],
        deterministic_failure_category="POLICY_FAILURE",
        deterministic_failure_severity="HIGH",
        evaluation_criteria=["Applies 90-day window"],
    )

    assert analysis.failure_category == "POLICY_FAILURE"
    assert graph is not None
    nodes = graph["nodes"] if isinstance(graph, dict) else graph.nodes
    assert len(nodes) >= 3
    node_types = [n["type"] if isinstance(n, dict) else n.type for n in nodes]
    assert "input" in node_types
    assert "root_cause" in node_types or "mechanism" in node_types


# ─── 2. Intervention Planner Test ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_intervention_planner():
    """Verify intervention engine plans targeted candidate fixes."""
    planner = InterventionPlannerService()
    candidates, is_live = await planner.plan_interventions(
        failure_category="POLICY_FAILURE",
        root_cause_hypothesis="Outdated policy v1 retrieved instead of current v2",
        recommended_intervention_types=["RETRIEVAL", "GUARDRAIL"],
    )

    assert len(candidates) > 0
    types = [c.type for c in candidates]
    assert any(t in types for t in ["RETRIEVAL", "GUARDRAIL", "PROMPT"])
    # Check config change exists
    assert any(c.config_change for c in candidates)


# ─── 3. Regression Firewall Unit Test ─────────────────────────────────────────

def test_regression_firewall_blocks_critical_failure():
    """Verify firewall blocks candidate that introduces critical failures."""
    firewall = RegressionFirewall()
    
    baseline_scores = {"task_success_score": 0.9, "safety_score": 1.0, "critical_failures": 0}
    candidate_scores = {"task_success_score": 0.95, "safety_score": 0.5, "critical_failures": 1}
    
    result = firewall.check_regression(
        baseline_scores=baseline_scores,
        candidate_scores=candidate_scores,
        baseline_results=[],
        candidate_results=[],
        holdout_baseline=0.90,
        holdout_candidate=0.88,
    )
    
    assert result["status"] == "BLOCKED"
    assert any(r["type"] == "CRITICAL_FAILURE" for r in result["regressions"])


def test_regression_firewall_passes_clean_candidate():
    """Verify firewall passes candidate with improved holdout and no regressions."""
    firewall = RegressionFirewall()
    
    baseline_scores = {"task_success_score": 0.8, "policy_compliance_score": 0.7, "critical_failures": 0}
    candidate_scores = {"task_success_score": 0.9, "policy_compliance_score": 0.95, "critical_failures": 0}
    
    result = firewall.check_regression(
        baseline_scores=baseline_scores,
        candidate_scores=candidate_scores,
        baseline_results=[],
        candidate_results=[],
        holdout_baseline=0.80,
        holdout_candidate=0.92,
    )
    
    assert result["status"] == "PASS"
    assert result["regression_count"] == 0


# ─── 4. End-to-End Experiment Lab & Generalization Flow ───────────────────────

@pytest.mark.asyncio
async def test_full_experiment_lab_flow():
    """
    Test complete P1 workflow:
    Seed agent -> create test suite with splits -> create intervention ->
    run experiment on optimization, validation, holdout -> verify holdout isolation ->
    decision ACCEPTED -> promote candidate to verified baseline
    """
    test_db_url = "sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(test_db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        await seed_demo_data(db)

        # Create test cases with splits
        suite = TestSuite(
            id="test-suite-1",
            agent_id=DEMO_AGENT_ID,
            name="P1 Test Suite",
            generated_by="deterministic",
        )
        db.add(suite)
        await db.flush()

        from app.services.test_generation import FALLBACK_TEST_CASES
        for i, tc_data in enumerate(FALLBACK_TEST_CASES[:15]):
            split = (
                TestSplit.OPTIMIZATION if i < 9
                else TestSplit.VALIDATION if i < 12
                else TestSplit.HOLDOUT
            )
            tc = TestCase(
                id=f"tc-{i}",
                suite_id=suite.id,
                category=tc_data["category"],
                severity=FailureSeverity(tc_data["severity"]),
                input=tc_data["input"],
                expected_behavior=tc_data["expected_behavior"],
                evaluation_criteria=tc_data["evaluation_criteria"],
                split=split,
            )
            db.add(tc)

        # Create an intervention (Policy v2 fix)
        interv = Intervention(
            id="interv-1",
            intervention_type="RETRIEVAL",
            description="Update policy retrieval to current Version 2.0",
            change_spec={"use_current_policy": True, "require_photo_evidence": True},
        )
        db.add(interv)
        await db.commit()

        # Run experiment
        req = RunExperimentRequest(
            intervention_id=interv.id,
            agent_id=DEMO_AGENT_ID,
            baseline_version_id=DEMO_BASELINE_VERSION_ID,
            candidate_config={"use_current_policy": True, "require_photo_evidence": True},
        )

        exp_result = await run_experiment(req, db)

        assert exp_result["experiment_id"] is not None
        assert exp_result["candidate_version"] is not None
        # Candidate with policy fix improves on holdout
        assert exp_result["holdout_candidate"] >= exp_result["holdout_baseline"]
        assert exp_result["decision"] == "ACCEPTED"
        assert exp_result["regression_count"] == 0

        # Promote candidate to verified baseline
        promote_result = await promote_candidate(exp_result["experiment_id"], db)
        assert promote_result["status"] == "promoted"

        # Verify candidate is now ACTIVE and baseline is DEPRECATED
        promoted_candidate = await db.get(AgentVersion, exp_result["candidate_version_id"])
        original_baseline = await db.get(AgentVersion, DEMO_BASELINE_VERSION_ID)
        assert promoted_candidate.status == AgentStatus.ACTIVE
        assert promoted_candidate.is_baseline is True
        assert original_baseline.status == AgentStatus.DEPRECATED
        assert original_baseline.is_baseline is False

    await engine.dispose()
