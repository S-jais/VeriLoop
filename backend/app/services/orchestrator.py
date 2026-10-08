"""
Main Orchestrator — coordinates the full VeriLoop evaluation workflow.
This is the engine that drives: TEST → DIAGNOSE → INTERVENE → VALIDATE → PROVE
"""

import logging
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import (
    Agent, AgentVersion, TestSuite, TestCase, EvaluationRun,
    TestResult, Failure, EvidenceItem, Intervention, Experiment,
    AgentStatus, EvaluationStatus, FailureCategory, FailureSeverity,
    TestSplit, InterventionType, ExperimentStatus,
)
from app.services.test_generation import TestGenerationService
from app.services.evaluation_engine import EvaluationEngine
from app.services.failure_analyzer import FailureAnalyzerService
from app.services.tavily_service import TavilyEvidenceService
from app.services.intervention_engine import InterventionPlannerService, RegressionFirewall

logger = logging.getLogger(__name__)


class EvaluationOrchestrator:
    """
    Orchestrates the full VeriLoop evaluation workflow.
    Emits SSE-compatible progress events for real-time UI updates.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.test_gen = TestGenerationService()
        self.eval_engine = EvaluationEngine()
        self.failure_analyzer = FailureAnalyzerService()
        self.tavily = TavilyEvidenceService()
        self.intervention_planner = InterventionPlannerService()
        self.regression_firewall = RegressionFirewall()

    async def run_full_evaluation(
        self,
        agent_id: str,
        agent_version_id: str,
        existing_suite_id: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Run the full evaluation workflow and yield progress events.
        Each event corresponds to a real backend action.
        """
        eval_run = None

        try:
            # ─── Load agent ───────────────────────────────────────────────────
            agent = await self.db.get(Agent, agent_id)
            if not agent:
                yield {"stage": "error", "message": f"Agent {agent_id} not found"}
                return

            version = await self.db.get(AgentVersion, agent_version_id)
            if not version:
                yield {"stage": "error", "message": f"Version {agent_version_id} not found"}
                return

            # ─── Stage 1: Generate or load test suite ─────────────────────────
            yield {"stage": "generating_tests", "message": "Generating evaluation test cases...", "progress": 5}

            suite_id = existing_suite_id
            test_cases_data = []

            if not existing_suite_id:
                test_cases, model_used, is_live = await self.test_gen.generate_tests(
                    agent_name=agent.name,
                    agent_description=agent.description or "",
                    count=20,
                )
                test_cases_with_splits = self.test_gen.assign_splits(test_cases)

                # Save suite + cases to DB
                suite = TestSuite(
                    id=str(uuid.uuid4()),
                    agent_id=agent_id,
                    name=f"Auto-generated suite — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                    generated_by=model_used,
                )
                self.db.add(suite)
                await self.db.flush()
                suite_id = suite.id

                for tc_data in test_cases_with_splits:
                    tc = TestCase(
                        id=str(uuid.uuid4()),
                        suite_id=suite_id,
                        category=tc_data["category"],
                        severity=FailureSeverity(tc_data["severity"]),
                        input=tc_data["input"],
                        expected_behavior=tc_data["expected_behavior"],
                        evaluation_criteria=tc_data["evaluation_criteria"],
                        split=TestSplit(tc_data["split"]),
                        source=tc_data.get("source", []),
                    )
                    self.db.add(tc)
                    test_cases_data.append(tc)

                await self.db.flush()
                yield {
                    "stage": "generating_tests",
                    "message": f"Generated {len(test_cases_data)} test cases",
                    "suite_id": suite_id,
                    "is_live": is_live,
                    "model": model_used,
                    "progress": 15,
                }
            else:
                # Load existing suite
                result = await self.db.execute(
                    select(TestCase).where(TestCase.suite_id == suite_id)
                )
                test_cases_data = result.scalars().all()
                yield {
                    "stage": "generating_tests",
                    "message": f"Loaded {len(test_cases_data)} existing test cases",
                    "suite_id": suite_id,
                    "progress": 15,
                }

            # ─── Stage 2: Create evaluation run ──────────────────────────────
            eval_run = EvaluationRun(
                id=str(uuid.uuid4()),
                agent_id=agent_id,
                agent_version_id=agent_version_id,
                suite_id=suite_id,
                status=EvaluationStatus.RUNNING,
                started_at=datetime.utcnow(),
            )
            self.db.add(eval_run)
            await self.db.flush()

            yield {"stage": "running_tests", "message": "Executing agent on test cases...", "eval_id": eval_run.id, "progress": 20}

            # ─── Stage 3: Run tests ───────────────────────────────────────────
            test_results = []
            for i, tc in enumerate(test_cases_data):
                tc_dict = {
                    "id": tc.id,
                    "input": tc.input,
                    "expected_behavior": tc.expected_behavior,
                    "evaluation_criteria": tc.evaluation_criteria or [],
                    "category": tc.category,
                    "severity": tc.severity.value if hasattr(tc.severity, "value") else tc.severity,
                }

                exec_result = await self.eval_engine.execute_test(
                    test_case=tc_dict,
                    adapter_type=agent.adapter_type,
                    agent_config=version.config,
                )

                # Save result
                tr = TestResult(
                    id=str(uuid.uuid4()),
                    evaluation_id=eval_run.id,
                    test_case_id=tc.id,
                    passed=exec_result.passed,
                    agent_response=exec_result.agent_response,
                    tool_calls=exec_result.tool_calls,
                    retrieved_context=exec_result.retrieved_context,
                    latency_ms=exec_result.latency_ms,
                    scores=exec_result.scores,
                    trace=exec_result.trace,
                    evaluator_notes=exec_result.evaluator_notes,
                    model_used=exec_result.model_used,
                )
                self.db.add(tr)
                test_results.append((tc, exec_result, tr))

                progress = 20 + int((i + 1) / len(test_cases_data) * 30)
                yield {
                    "stage": "running_tests",
                    "message": f"Tested {i + 1}/{len(test_cases_data)}: {'✓' if exec_result.passed else '✗'} {tc.category}",
                    "progress": progress,
                }

            await self.db.flush()

            # ─── Stage 4: Calculate scores ────────────────────────────────────
            yield {"stage": "analyzing_failures", "message": "Detecting and classifying failures...", "progress": 52}

            all_exec_results = [r[1] for r in test_results]
            scores = self.eval_engine.calculate_reliability_score(all_exec_results)

            # Update eval run with scores
            eval_run.reliability_score = scores["reliability_score"]
            eval_run.task_success_score = scores["task_success_score"]
            eval_run.grounding_score = scores["grounding_score"]
            eval_run.tool_correctness_score = scores["tool_correctness_score"]
            eval_run.policy_compliance_score = scores["policy_compliance_score"]
            eval_run.safety_score = scores["safety_score"]
            eval_run.context_handling_score = scores["context_handling_score"]
            eval_run.total_tests = scores["total_tests"]
            eval_run.passed_tests = scores["passed_tests"]
            eval_run.failed_tests = scores["failed_tests"]
            eval_run.critical_failures = scores["critical_failures"]

            # ─── Stage 5: Analyze failures ────────────────────────────────────
            failures_created = []
            failed_tests = [(tc, er, tr) for tc, er, tr in test_results if not er.passed]

            for tc, er, tr in failed_tests[:5]:  # Analyze top 5 failures in depth
                tc_dict = {
                    "input": tc.input,
                    "expected_behavior": tc.expected_behavior,
                    "evaluation_criteria": tc.evaluation_criteria or [],
                    "category": tc.category,
                }

                analysis, causal_graph, is_live_analysis = await self.failure_analyzer.analyze_failure(
                    test_input=tc.input,
                    expected_behavior=tc.expected_behavior,
                    agent_response=er.agent_response,
                    tool_calls=er.tool_calls,
                    retrieved_context=er.retrieved_context,
                    deterministic_failure_category=er.failure_category,
                    deterministic_failure_severity=er.failure_severity,
                    evaluation_criteria=tc.evaluation_criteria or [],
                )

                failure = Failure(
                    id=str(uuid.uuid4()),
                    evaluation_id=eval_run.id,
                    test_result_id=tr.id,
                    category=FailureCategory(analysis.failure_category),
                    severity=FailureSeverity(analysis.severity),
                    expected_behavior=tc.expected_behavior,
                    observed_behavior=er.agent_response[:500],
                    root_cause_hypothesis=analysis.root_cause_hypothesis,
                    root_cause_confidence=analysis.confidence,
                    evidence_needed=analysis.evidence_needed,
                    recommended_interventions=analysis.recommended_interventions,
                    causal_graph=causal_graph,
                    status="diagnosed",
                )
                self.db.add(failure)
                failures_created.append((failure, analysis))

                # ─── Stage 6: Tavily research if needed ───────────────────────
                if analysis.evidence_needed and analysis.evidence_query:
                    yield {
                        "stage": "researching_evidence",
                        "message": f"Researching: {analysis.evidence_query[:60]}...",
                        "progress": 65,
                    }
                    evidence_results, is_live_search = await self.tavily.research(
                        query=analysis.evidence_query,
                        reason=analysis.root_cause_hypothesis,
                        failure_id=failure.id,
                    )
                    for ev in evidence_results:
                        ev_item = EvidenceItem(
                            id=str(uuid.uuid4()),
                            failure_id=failure.id,
                            query=ev.query,
                            source_url=ev.source_url,
                            source_title=ev.source_title,
                            content_summary=ev.content_summary,
                            reason_for_research=ev.reason,
                        )
                        self.db.add(ev_item)

            await self.db.flush()

            yield {
                "stage": "analyzing_failures",
                "message": f"Analyzed {len(failures_created)} failures",
                "critical_failures": scores["critical_failures"],
                "progress": 70,
            }

            # ─── Stage 7: Plan interventions ──────────────────────────────────
            if failures_created:
                yield {"stage": "generating_interventions", "message": "Planning targeted interventions...", "progress": 75}

                # Use most severe failure for intervention planning
                top_failure, top_analysis = failures_created[0]

                intervention_candidates, is_live_intervention = await self.intervention_planner.plan_interventions(
                    failure_category=top_analysis.failure_category,
                    root_cause_hypothesis=top_analysis.root_cause_hypothesis,
                    recommended_intervention_types=top_analysis.recommended_interventions,
                    agent_config=version.config,
                )

                saved_interventions = []
                for candidate in intervention_candidates:
                    intervention = Intervention(
                        id=str(uuid.uuid4()),
                        failure_id=top_failure.id,
                        intervention_type=InterventionType(candidate.type),
                        description=candidate.description,
                        change_spec=candidate.config_change,
                    )
                    self.db.add(intervention)
                    saved_interventions.append(intervention)

                await self.db.flush()

                yield {
                    "stage": "generating_interventions",
                    "message": f"Generated {len(saved_interventions)} intervention candidates",
                    "is_live": is_live_intervention,
                    "progress": 82,
                }

            # ─── Finalize evaluation ──────────────────────────────────────────
            eval_run.status = EvaluationStatus.COMPLETED
            eval_run.completed_at = datetime.utcnow()
            await self.db.commit()

            yield {
                "stage": "completed",
                "message": "Evaluation complete",
                "eval_id": eval_run.id,
                "suite_id": suite_id,
                "reliability_score": scores["reliability_score"],
                "total_tests": scores["total_tests"],
                "passed_tests": scores["passed_tests"],
                "failed_tests": scores["failed_tests"],
                "critical_failures": scores["critical_failures"],
                "progress": 100,
            }

        except Exception as e:
            logger.error("Evaluation orchestration failed: %s", str(e), exc_info=True)
            if eval_run:
                eval_run.status = EvaluationStatus.FAILED
                await self.db.commit()
            yield {"stage": "error", "message": f"Evaluation failed: {str(e)}", "progress": 100}
