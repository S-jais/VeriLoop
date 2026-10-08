"""
Pydantic schemas for structured AI model outputs.
All critical agent outputs are validated against these schemas.
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


# ─── Test Generation ──────────────────────────────────────────────────────────

class GeneratedTestCase(BaseModel):
    category: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    input: str
    expected_behavior: str
    evaluation_criteria: list[str]
    source: list[str] = Field(default_factory=list)


class TestGenerationOutput(BaseModel):
    test_cases: list[GeneratedTestCase]


# ─── Failure Analysis ─────────────────────────────────────────────────────────

class FailureAnalysisOutput(BaseModel):
    failure_category: Literal[
        "GROUNDING_FAILURE",
        "TOOL_FAILURE",
        "POLICY_FAILURE",
        "INSTRUCTION_FAILURE",
        "CONTEXT_FAILURE",
        "SAFETY_FAILURE",
        "RETRIEVAL_FAILURE",
        "UNKNOWN",
    ]
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    root_cause_hypothesis: str = Field(
        description="Concise description of the most likely root cause"
    )
    evidence_needed: bool = Field(
        description="Whether external evidence research is required to verify"
    )
    evidence_query: Optional[str] = Field(
        default=None,
        description="If evidence_needed, the specific search query to use"
    )
    recommended_interventions: list[Literal[
        "PROMPT", "TOOL", "RETRIEVAL", "MEMORY", "GUARDRAIL", "WORKFLOW"
    ]]
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Model-estimated confidence in this analysis (not statistical probability)"
    )
    summary: str = Field(
        description="One-sentence plain English summary safe to show to users"
    )
    causal_chain: list[str] = Field(
        default_factory=list,
        description="Ordered list of causal steps from symptom to root cause"
    )


# ─── Intervention Planning ────────────────────────────────────────────────────

class InterventionCandidate(BaseModel):
    type: Literal["PROMPT", "TOOL", "RETRIEVAL", "MEMORY", "GUARDRAIL", "WORKFLOW"]
    description: str
    rationale: str
    config_change: dict = Field(default_factory=dict)
    risk: Literal["LOW", "MEDIUM", "HIGH"]


class InterventionPlanOutput(BaseModel):
    interventions: list[InterventionCandidate]


# ─── Evaluation ───────────────────────────────────────────────────────────────

class TestEvaluationOutput(BaseModel):
    passed: bool
    task_success_score: float = Field(ge=0.0, le=1.0)
    grounding_score: float = Field(ge=0.0, le=1.0)
    tool_correctness_score: float = Field(ge=0.0, le=1.0)
    policy_compliance_score: float = Field(ge=0.0, le=1.0)
    safety_score: float = Field(ge=0.0, le=1.0)
    context_handling_score: float = Field(ge=0.0, le=1.0)
    failure_category: Optional[Literal[
        "GROUNDING_FAILURE", "TOOL_FAILURE", "POLICY_FAILURE",
        "INSTRUCTION_FAILURE", "CONTEXT_FAILURE", "SAFETY_FAILURE",
        "RETRIEVAL_FAILURE", "UNKNOWN"
    ]] = None
    failure_severity: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None
    evaluator_notes: str = ""
    observed_issues: list[str] = Field(default_factory=list)


# ─── Regression Decision ──────────────────────────────────────────────────────

class RegressionCheckOutput(BaseModel):
    status: Literal["PASS", "BLOCKED"]
    regression_count: int
    regression_details: list[dict]
    blocking_reason: Optional[str] = None
    summary: str
