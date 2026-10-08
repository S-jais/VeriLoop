"""
Intervention Engine — Role 5: Intervention Planner + Role 6: Experiment Runner
Plans and runs intervention experiments using Nebius Token Factory.
"""

import logging
import time
from typing import Optional
from pathlib import Path

from app.core.nebius_provider import get_nebius_provider
from app.core.config import get_settings
from app.models.schemas import InterventionPlanOutput, InterventionCandidate

logger = logging.getLogger(__name__)
settings = get_settings()

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "intervention-planner.txt"


# ─── Known Interventions for Demo Agent ───────────────────────────────────────

DEMO_INTERVENTIONS = {
    "policy_retrieval_fix": {
        "type": "RETRIEVAL",
        "description": "Update the agent to use the current policy document (v2.0) instead of the outdated v1.0 policy.",
        "rationale": "The agent's check_policy() tool returns an outdated policy document. Switching to the current v2 policy will fix return window, evidence requirements, and receipt alternatives.",
        "config_change": {"use_current_policy": True},
        "risk": "LOW",
    },
    "evidence_guardrail": {
        "type": "GUARDRAIL",
        "description": "Add a prompt-level instruction requiring photo evidence for all damage claims before processing.",
        "rationale": "Adding explicit evidence verification to the system prompt ensures the agent always requests proof before approving replacement.",
        "config_change": {"require_photo_evidence": True},
        "risk": "LOW",
    },
    "high_value_workflow": {
        "type": "WORKFLOW",
        "description": "Add a manager approval step for items over $300.",
        "rationale": "Current policy requires manager approval for high-value replacements. Adding this workflow step prevents unauthorized high-value approvals.",
        "config_change": {"check_high_value": True},
        "risk": "LOW",
    },
    "combined_fix": {
        "type": "PROMPT",
        "description": "Combined fix: current policy + evidence requirements + high-value checks.",
        "rationale": "Applies all three targeted fixes together for comprehensive policy compliance.",
        "config_change": {
            "use_current_policy": True,
            "require_photo_evidence": True,
            "check_high_value": True,
        },
        "risk": "MEDIUM",
    },
}


class InterventionPlannerService:
    """
    Role 5: Intervention Planner
    Plans targeted interventions based on failure analysis.
    """

    def __init__(self):
        self._provider = get_nebius_provider()

    async def plan_interventions(
        self,
        failure_category: str,
        root_cause_hypothesis: str,
        recommended_intervention_types: list[str],
        agent_config: Optional[dict] = None,
        evidence_items: Optional[list[dict]] = None,
    ) -> tuple[list[InterventionCandidate], bool]:
        """
        Generate intervention candidates.
        Returns: (candidates, is_live_inference)
        """
        if not settings.is_nebius_configured():
            return self._deterministic_plan(failure_category, recommended_intervention_types), False

        system_prompt = PROMPT_PATH.read_text(encoding="utf-8")
        evidence_text = ""
        if evidence_items:
            evidence_text = "\n".join(
                f"- {item.get('source_title', '')}: {item.get('content_summary', '')[:200]}"
                for item in evidence_items[:3]
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"FAILURE ANALYSIS:\n"
                    f"Category: {failure_category}\n"
                    f"Root Cause: {root_cause_hypothesis}\n"
                    f"Recommended Types: {recommended_intervention_types}\n\n"
                    f"Agent Config: {agent_config}\n\n"
                    f"Evidence: {evidence_text or 'None gathered'}\n\n"
                    f"Generate 2-3 targeted intervention candidates. "
                    f"For the demo agent, valid config changes include: "
                    f"use_current_policy (bool), require_photo_evidence (bool), "
                    f"check_high_value (bool). "
                    f"Return a JSON object with an 'interventions' array."
                ),
            },
        ]

        try:
            output, result = await self._provider.generate_structured(
                messages=messages,
                schema_class=InterventionPlanOutput,
                model=settings.nebius_primary_model,
                task_label="intervention_planning",
                temperature=0.3,
            )
            logger.info(
                "Intervention planning complete model=%s candidates=%d",
                result.model, len(output.interventions)
            )
            return output.interventions, True

        except Exception as e:
            logger.error("Intervention planning via Nebius failed: %s", str(e))
            return self._deterministic_plan(failure_category, recommended_intervention_types), False

    def _deterministic_plan(
        self,
        failure_category: str,
        recommended_types: list[str],
    ) -> list[InterventionCandidate]:
        """Fallback intervention candidates based on known failure patterns."""
        candidates = []

        if failure_category == "POLICY_FAILURE" or "RETRIEVAL" in recommended_types:
            candidates.append(InterventionCandidate(**DEMO_INTERVENTIONS["policy_retrieval_fix"]))

        if "GUARDRAIL" in recommended_types or failure_category == "POLICY_FAILURE":
            candidates.append(InterventionCandidate(**DEMO_INTERVENTIONS["evidence_guardrail"]))

        if "WORKFLOW" in recommended_types:
            candidates.append(InterventionCandidate(**DEMO_INTERVENTIONS["high_value_workflow"]))

        if not candidates:
            candidates.append(InterventionCandidate(**DEMO_INTERVENTIONS["combined_fix"]))

        return candidates[:3]


class RegressionFirewall:
    """
    Regression Firewall — checks candidate versions don't regress.
    """

    REGRESSION_THRESHOLD = 0.05  # Allow max 5% score drop
    CRITICAL_FAILURE_THRESHOLD = 0  # No new critical failures allowed

    def check_regression(
        self,
        baseline_scores: dict,
        candidate_scores: dict,
        baseline_results: list,
        candidate_results: list,
        holdout_baseline: float,
        holdout_candidate: float,
    ) -> dict:
        """
        Check if candidate version regresses on any important metric.
        Returns structured regression report.
        """
        regressions = []

        # Check per-category score drops
        score_keys = ["task_success", "grounding", "tool_correctness", "policy_compliance", "safety"]
        for key in score_keys:
            baseline_val = baseline_scores.get(f"{key}_score", 0)
            candidate_val = candidate_scores.get(f"{key}_score", 0)
            drop = baseline_val - candidate_val
            if drop > self.REGRESSION_THRESHOLD:
                regressions.append({
                    "type": "SCORE_DROP",
                    "metric": key,
                    "baseline": round(baseline_val, 4),
                    "candidate": round(candidate_val, 4),
                    "drop": round(drop, 4),
                    "description": f"{key} dropped by {drop:.1%}",
                })

        # Check holdout regression
        holdout_drop = holdout_baseline - holdout_candidate
        if holdout_drop > self.REGRESSION_THRESHOLD:
            regressions.append({
                "type": "HOLDOUT_DROP",
                "metric": "holdout_reliability",
                "baseline": round(holdout_baseline, 4),
                "candidate": round(holdout_candidate, 4),
                "drop": round(holdout_drop, 4),
                "description": f"Holdout reliability dropped by {holdout_drop:.1%}",
            })

        # Check new critical failures
        baseline_critical = baseline_scores.get("critical_failures", 0)
        candidate_critical = candidate_scores.get("critical_failures", 0)
        if candidate_critical > baseline_critical:
            regressions.append({
                "type": "CRITICAL_FAILURE",
                "metric": "critical_failures",
                "baseline": baseline_critical,
                "candidate": candidate_critical,
                "increase": candidate_critical - baseline_critical,
                "description": f"New critical failures introduced: {candidate_critical - baseline_critical}",
            })

        blocking_regressions = [
            r for r in regressions
            if r["type"] in ("CRITICAL_FAILURE", "HOLDOUT_DROP")
        ]

        status = "BLOCKED" if blocking_regressions else "PASS"

        return {
            "status": status,
            "regression_count": len(regressions),
            "regressions": regressions,
            "blocking_regressions": blocking_regressions,
            "blocking_reason": blocking_regressions[0]["description"] if blocking_regressions else None,
            "summary": (
                f"BLOCKED: {blocking_regressions[0]['description']}"
                if blocking_regressions
                else f"No regressions detected. {len(regressions)} minor issues noted."
            ),
        }
