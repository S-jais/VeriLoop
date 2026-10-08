"""
Experiments API routes — run intervention experiments and check regressions.
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import (
    Agent, AgentVersion, TestCase, Experiment, Intervention,
    AgentStatus, ExperimentStatus, TestSplit,
)
from app.services.evaluation_engine import EvaluationEngine
from app.services.intervention_engine import RegressionFirewall

router = APIRouter()


class RunExperimentRequest(BaseModel):
    intervention_id: str
    agent_id: str
    baseline_version_id: str
    candidate_config: dict


@router.post("")
async def run_experiment(req: RunExperimentRequest, db: AsyncSession = Depends(get_db)):
    """
    Run a full intervention experiment:
    - Creates candidate version
    - Runs optimization, validation, and holdout evaluations
    - Checks regressions
    - Accepts or rejects candidate
    """
    agent = await db.get(Agent, req.agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    baseline = await db.get(AgentVersion, req.baseline_version_id)
    if not baseline:
        raise HTTPException(404, "Baseline version not found")

    intervention = await db.get(Intervention, req.intervention_id)
    if not intervention:
        raise HTTPException(404, "Intervention not found")

    # Create candidate version
    candidate_version_num = f"v1.{_next_version(baseline.version)}"
    candidate = AgentVersion(
        id=str(uuid.uuid4()),
        agent_id=req.agent_id,
        version=candidate_version_num,
        status=AgentStatus.CANDIDATE,
        config=req.candidate_config,
        is_baseline=False,
        parent_version_id=baseline.id,
        notes=f"Candidate for intervention: {intervention.description[:100]}",
    )
    db.add(candidate)
    await db.flush()

    # Load test cases by split
    result = await db.execute(select(TestCase))
    all_test_cases = result.scalars().all()

    opt_cases = [tc for tc in all_test_cases if tc.split == TestSplit.OPTIMIZATION]
    val_cases = [tc for tc in all_test_cases if tc.split == TestSplit.VALIDATION]
    holdout_cases = [tc for tc in all_test_cases if tc.split == TestSplit.HOLDOUT]

    engine = EvaluationEngine()

    async def run_split(cases, config):
        results = []
        for tc in cases:
            tc_dict = {
                "id": tc.id,
                "input": tc.input,
                "expected_behavior": tc.expected_behavior,
                "evaluation_criteria": tc.evaluation_criteria or [],
                "category": tc.category,
                "severity": tc.severity.value if hasattr(tc.severity, "value") else tc.severity,
            }
            r = await engine.execute_test(
                test_case=tc_dict,
                adapter_type=agent.adapter_type,
                agent_config=config,
            )
            results.append(r)
        return results

    # Run baseline on optimization + validation + holdout
    baseline_opt = await run_split(opt_cases, baseline.config or {})
    baseline_val = await run_split(val_cases, baseline.config or {})
    baseline_holdout = await run_split(holdout_cases, baseline.config or {})

    # Run candidate (CRITICAL: holdout must not be used in optimization feedback)
    # The candidate is evaluated on holdout AFTER intervention is determined — no leakage
    candidate_opt = await run_split(opt_cases, req.candidate_config)
    candidate_val = await run_split(val_cases, req.candidate_config)
    candidate_holdout = await run_split(holdout_cases, req.candidate_config)  # holdout evaluation only, never in optimization

    # Score each
    b_opt_scores = engine.calculate_reliability_score(baseline_opt)
    b_val_scores = engine.calculate_reliability_score(baseline_val)
    b_hold_scores = engine.calculate_reliability_score(baseline_holdout)
    c_opt_scores = engine.calculate_reliability_score(candidate_opt)
    c_val_scores = engine.calculate_reliability_score(candidate_val)
    c_hold_scores = engine.calculate_reliability_score(candidate_holdout)

    # Run regression firewall
    firewall = RegressionFirewall()
    regression_result = firewall.check_regression(
        baseline_scores=b_val_scores,
        candidate_scores=c_val_scores,
        baseline_results=baseline_val,
        candidate_results=candidate_val,
        holdout_baseline=b_hold_scores["reliability_score"],
        holdout_candidate=c_hold_scores["reliability_score"],
    )

    # Decision
    if regression_result["status"] == "BLOCKED":
        decision = "REJECTED"
        candidate.status = AgentStatus.REJECTED
    elif c_hold_scores["reliability_score"] >= b_hold_scores["reliability_score"]:
        decision = "ACCEPTED"
        candidate.status = AgentStatus.VERIFIED
    else:
        decision = "REJECTED"
        candidate.status = AgentStatus.REJECTED

    # Save experiment
    experiment = Experiment(
        id=str(uuid.uuid4()),
        intervention_id=req.intervention_id,
        candidate_version_id=candidate.id,
        baseline_version_id=baseline.id,
        status=ExperimentStatus.ACCEPTED if decision == "ACCEPTED" else ExperimentStatus.REJECTED,
        optimization_baseline=b_opt_scores["reliability_score"],
        optimization_candidate=c_opt_scores["reliability_score"],
        validation_baseline=b_val_scores["reliability_score"],
        validation_candidate=c_val_scores["reliability_score"],
        holdout_baseline=b_hold_scores["reliability_score"],
        holdout_candidate=c_hold_scores["reliability_score"],
        critical_failures_before=b_hold_scores["critical_failures"],
        critical_failures_after=c_hold_scores["critical_failures"],
        regression_count=regression_result["regression_count"],
        regression_details=regression_result["regressions"],
        decision=decision,
        decision_reason=regression_result["summary"],
        completed_at=datetime.utcnow(),
    )
    db.add(experiment)
    await db.commit()

    return {
        "experiment_id": experiment.id,
        "candidate_version_id": candidate.id,
        "candidate_version": candidate_version_num,
        "decision": decision,
        "optimization_baseline": b_opt_scores["reliability_score"],
        "optimization_candidate": c_opt_scores["reliability_score"],
        "validation_baseline": b_val_scores["reliability_score"],
        "validation_candidate": c_val_scores["reliability_score"],
        "holdout_baseline": b_hold_scores["reliability_score"],
        "holdout_candidate": c_hold_scores["reliability_score"],
        "critical_failures_before": b_hold_scores["critical_failures"],
        "critical_failures_after": c_hold_scores["critical_failures"],
        "regression_count": regression_result["regression_count"],
        "regression_status": regression_result["status"],
        "regression_summary": regression_result["summary"],
    }


@router.get("")
async def list_experiments(db: AsyncSession = Depends(get_db)):
    """List all experiments."""
    query = select(Experiment).order_by(Experiment.created_at.desc()).limit(50)
    result = await db.execute(query)
    experiments = result.scalars().all()

    formatted = []
    for exp in experiments:
        interv = await db.get(Intervention, exp.intervention_id)
        cand = await db.get(AgentVersion, exp.candidate_version_id)
        base = await db.get(AgentVersion, exp.baseline_version_id)
        formatted.append({
            "id": exp.id,
            "intervention_id": exp.intervention_id,
            "intervention_description": interv.description if interv else "Targeted fix",
            "candidate_version_id": exp.candidate_version_id,
            "candidate_version": cand.version if cand else "Candidate",
            "baseline_version_id": exp.baseline_version_id,
            "baseline_version": base.version if base else "Baseline",
            "status": exp.status.value if hasattr(exp.status, "value") else exp.status,
            "optimization_baseline": exp.optimization_baseline,
            "optimization_candidate": exp.optimization_candidate,
            "validation_baseline": exp.validation_baseline,
            "validation_candidate": exp.validation_candidate,
            "holdout_baseline": exp.holdout_baseline,
            "holdout_candidate": exp.holdout_candidate,
            "critical_failures_before": exp.critical_failures_before,
            "critical_failures_after": exp.critical_failures_after,
            "regression_count": exp.regression_count,
            "regression_details": exp.regression_details or [],
            "decision": exp.decision,
            "decision_reason": exp.decision_reason,
            "created_at": exp.created_at.isoformat() if exp.created_at else None,
            "completed_at": exp.completed_at.isoformat() if exp.completed_at else None,
        })
    return formatted


@router.get("/interventions")
async def list_interventions(failure_id: str | None = None, db: AsyncSession = Depends(get_db)):
    """List available interventions from evaluations or demo catalog."""
    query = select(Intervention).order_by(Intervention.created_at.desc())
    if failure_id:
        query = query.where(Intervention.failure_id == failure_id)
    result = await db.execute(query)
    interventions = result.scalars().all()

    items = []
    for it in interventions:
        items.append({
            "id": it.id,
            "failure_id": it.failure_id,
            "intervention_type": it.intervention_type.value if hasattr(it.intervention_type, "value") else str(it.intervention_type),
            "description": it.description,
            "change_spec": it.change_spec,
            "created_at": it.created_at.isoformat() if it.created_at else None,
        })

    # Always ensure catalog interventions are available
    from app.services.intervention_engine import DEMO_INTERVENTIONS
    for key, val in DEMO_INTERVENTIONS.items():
        if not any(it["description"] == val["description"] for it in items):
            items.append({
                "id": f"catalog-{key}",
                "failure_id": None,
                "intervention_type": val["type"],
                "description": val["description"],
                "change_spec": val["config_change"],
                "rationale": val.get("rationale", ""),
                "risk": val.get("risk", "LOW"),
                "is_catalog": True,
            })
    return items


@router.get("/{experiment_id}")
async def get_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    exp = await db.get(Experiment, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")
    interv = await db.get(Intervention, exp.intervention_id)
    cand = await db.get(AgentVersion, exp.candidate_version_id)
    base = await db.get(AgentVersion, exp.baseline_version_id)
    return {
        "id": exp.id,
        "intervention_id": exp.intervention_id,
        "intervention_description": interv.description if interv else "Targeted fix",
        "candidate_version_id": exp.candidate_version_id,
        "candidate_version": cand.version if cand else "Candidate",
        "baseline_version_id": exp.baseline_version_id,
        "baseline_version": base.version if base else "Baseline",
        "status": exp.status.value if hasattr(exp.status, "value") else exp.status,
        "optimization_baseline": exp.optimization_baseline,
        "optimization_candidate": exp.optimization_candidate,
        "validation_baseline": exp.validation_baseline,
        "validation_candidate": exp.validation_candidate,
        "holdout_baseline": exp.holdout_baseline,
        "holdout_candidate": exp.holdout_candidate,
        "critical_failures_before": exp.critical_failures_before,
        "critical_failures_after": exp.critical_failures_after,
        "regression_count": exp.regression_count,
        "regression_details": exp.regression_details or [],
        "decision": exp.decision,
        "decision_reason": exp.decision_reason,
        "created_at": exp.created_at.isoformat() if exp.created_at else None,
        "completed_at": exp.completed_at.isoformat() if exp.completed_at else None,
    }


@router.post("/{experiment_id}/promote")
async def promote_candidate(experiment_id: str, db: AsyncSession = Depends(get_db)):
    """Promote an accepted candidate to active baseline."""
    exp = await db.get(Experiment, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")
    if exp.decision != "ACCEPTED":
        raise HTTPException(400, "Only ACCEPTED experiments can be promoted")

    candidate = await db.get(AgentVersion, exp.candidate_version_id)
    baseline = await db.get(AgentVersion, exp.baseline_version_id)

    if baseline:
        baseline.status = AgentStatus.DEPRECATED
        baseline.is_baseline = False

    if candidate:
        candidate.status = AgentStatus.ACTIVE
        candidate.is_baseline = True

    await db.commit()
    return {
        "status": "promoted",
        "new_baseline_version": candidate.version if candidate else "unknown",
        "promoted_at": datetime.utcnow().isoformat(),
    }


def _next_version(version_str: str) -> int:
    """Extract minor version number and increment."""
    try:
        parts = version_str.replace("v", "").split(".")
        return int(parts[1]) + 1 if len(parts) > 1 else 1
    except Exception:
        return 1
