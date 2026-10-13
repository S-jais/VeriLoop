"""
SQLAlchemy ORM models for VeriLoop.
All tables with explicit foreign key relationships.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


def gen_uuid() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.utcnow()


# ─── Enums ────────────────────────────────────────────────────────────────────

class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    CANDIDATE = "candidate"
    VERIFIED = "verified"
    REJECTED = "rejected"


class EvaluationStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FailureSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FailureCategory(str, enum.Enum):
    GROUNDING_FAILURE = "GROUNDING_FAILURE"
    TOOL_FAILURE = "TOOL_FAILURE"
    POLICY_FAILURE = "POLICY_FAILURE"
    INSTRUCTION_FAILURE = "INSTRUCTION_FAILURE"
    CONTEXT_FAILURE = "CONTEXT_FAILURE"
    SAFETY_FAILURE = "SAFETY_FAILURE"
    RETRIEVAL_FAILURE = "RETRIEVAL_FAILURE"
    UNKNOWN = "UNKNOWN"


class TestSplit(str, enum.Enum):
    OPTIMIZATION = "optimization"
    VALIDATION = "validation"
    HOLDOUT = "holdout"


class InterventionType(str, enum.Enum):
    PROMPT = "PROMPT"
    TOOL = "TOOL"
    RETRIEVAL = "RETRIEVAL"
    MEMORY = "MEMORY"
    GUARDRAIL = "GUARDRAIL"
    WORKFLOW = "WORKFLOW"


class ExperimentStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class RegressionStatus(str, enum.Enum):
    PASS = "PASS"
    BLOCKED = "BLOCKED"


# ─── Tables ───────────────────────────────────────────────────────────────────

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    adapter_type = Column(String, nullable=False)  # e.g. "demo_customer_support", "http_webhook"
    is_demo = Column(Boolean, default=False)
    connection_type = Column(String, default="demo")  # demo | api_endpoint | zip_upload | github_repo | config_import
    endpoint_url = Column(String, nullable=True)
    http_method = Column(String, default="POST")
    auth_type = Column(String, default="none")  # none | bearer | api_key_header | basic
    auth_header_name = Column(String, default="Authorization")
    auth_token_masked = Column(String, nullable=True)
    request_headers = Column(JSON, default=dict)
    request_body_template = Column(JSON, nullable=True)
    input_path = Column(String, default="input")
    output_path = Column(String, default="response")
    timeout_seconds = Column(Integer, default=15)
    retry_count = Column(Integer, default=2)
    connection_status = Column(String, default="connected")  # connected | auth_failed | timeout | unreachable | config_required | disabled
    last_tested_at = Column(DateTime, nullable=True)
    framework = Column(String, default="custom")
    repository_url = Column(String, nullable=True)
    repository_branch = Column(String, nullable=True)
    artifact_hash = Column(String, nullable=True)
    system_prompt = Column(Text, nullable=True)
    tools_schema = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    versions = relationship("AgentVersion", back_populates="agent")
    test_suites = relationship("TestSuite", back_populates="agent")
    replays = relationship("FailureReplay", back_populates="agent")
    drift_monitors = relationship("DriftMonitor", back_populates="agent")


class AgentVersion(Base):
    __tablename__ = "agent_versions"

    id = Column(String, primary_key=True, default=gen_uuid)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    version = Column(String, nullable=False)  # e.g. "v1.0"
    status = Column(SAEnum(AgentStatus), default=AgentStatus.ACTIVE)
    config = Column(JSON)  # version-specific config / prompt overrides
    is_baseline = Column(Boolean, default=False)
    parent_version_id = Column(String, ForeignKey("agent_versions.id"), nullable=True)
    created_at = Column(DateTime, default=now_utc)
    notes = Column(Text)

    agent = relationship("Agent", back_populates="versions")
    evaluations = relationship("EvaluationRun", back_populates="agent_version")
    experiments = relationship("Experiment", foreign_keys="[Experiment.candidate_version_id]", back_populates="candidate_version")


class TestSuite(Base):
    __tablename__ = "test_suites"

    id = Column(String, primary_key=True, default=gen_uuid)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    name = Column(String, nullable=False)
    generated_by = Column(String)  # model that generated tests
    created_at = Column(DateTime, default=now_utc)

    agent = relationship("Agent", back_populates="test_suites")
    test_cases = relationship("TestCase", back_populates="suite")
    evaluations = relationship("EvaluationRun", back_populates="test_suite")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(String, primary_key=True, default=gen_uuid)
    suite_id = Column(String, ForeignKey("test_suites.id"), nullable=False)
    category = Column(String, nullable=False)
    severity = Column(SAEnum(FailureSeverity), default=FailureSeverity.MEDIUM)
    input = Column(Text, nullable=False)
    expected_behavior = Column(Text, nullable=False)
    evaluation_criteria = Column(JSON)  # list of criteria strings
    split = Column(SAEnum(TestSplit), nullable=False)
    source = Column(JSON)  # metadata/sources
    created_at = Column(DateTime, default=now_utc)

    suite = relationship("TestSuite", back_populates="test_cases")
    results = relationship("TestResult", back_populates="test_case")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, default=gen_uuid)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    agent_version_id = Column(String, ForeignKey("agent_versions.id"), nullable=False)
    suite_id = Column(String, ForeignKey("test_suites.id"), nullable=False)
    status = Column(SAEnum(EvaluationStatus), default=EvaluationStatus.PENDING)
    split_filter = Column(String, nullable=True)  # which split(s) were evaluated
    reliability_score = Column(Float, nullable=True)
    task_success_score = Column(Float, nullable=True)
    grounding_score = Column(Float, nullable=True)
    tool_correctness_score = Column(Float, nullable=True)
    policy_compliance_score = Column(Float, nullable=True)
    safety_score = Column(Float, nullable=True)
    context_handling_score = Column(Float, nullable=True)
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    critical_failures = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    model_used = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_utc)

    agent_version = relationship("AgentVersion", back_populates="evaluations")
    test_suite = relationship("TestSuite", back_populates="evaluations")
    results = relationship("TestResult", back_populates="evaluation")
    failures = relationship("Failure", back_populates="evaluation")


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    evaluation_id = Column(String, ForeignKey("evaluation_runs.id"), nullable=False)
    test_case_id = Column(String, ForeignKey("test_cases.id"), nullable=False)
    passed = Column(Boolean, nullable=False)
    agent_response = Column(Text)
    tool_calls = Column(JSON)
    retrieved_context = Column(JSON)
    latency_ms = Column(Integer)
    scores = Column(JSON)  # per-dimension scores
    trace = Column(JSON)  # full execution trace
    evaluator_notes = Column(Text)
    model_used = Column(String)
    created_at = Column(DateTime, default=now_utc)

    evaluation = relationship("EvaluationRun", back_populates="results")
    test_case = relationship("TestCase", back_populates="results")
    failure = relationship("Failure", back_populates="test_result", uselist=False)


class Failure(Base):
    __tablename__ = "failures"

    id = Column(String, primary_key=True, default=gen_uuid)
    evaluation_id = Column(String, ForeignKey("evaluation_runs.id"), nullable=False)
    test_result_id = Column(String, ForeignKey("test_results.id"), nullable=True)
    category = Column(SAEnum(FailureCategory), default=FailureCategory.UNKNOWN)
    severity = Column(SAEnum(FailureSeverity), default=FailureSeverity.MEDIUM)
    expected_behavior = Column(Text)
    observed_behavior = Column(Text)
    root_cause_hypothesis = Column(Text)
    root_cause_confidence = Column(Float)
    evidence_needed = Column(Boolean, default=False)
    recommended_interventions = Column(JSON)  # list of InterventionType strings
    causal_graph = Column(JSON)  # structured graph nodes/edges
    status = Column(String, default="open")  # open | diagnosed | fixed | wontfix
    created_at = Column(DateTime, default=now_utc)

    evaluation = relationship("EvaluationRun", back_populates="failures")
    test_result = relationship("TestResult", back_populates="failure")
    evidence_items = relationship("EvidenceItem", back_populates="failure")
    interventions = relationship("Intervention", back_populates="failure")


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(String, primary_key=True, default=gen_uuid)
    failure_id = Column(String, ForeignKey("failures.id"), nullable=True)
    query = Column(Text)
    source_url = Column(String)
    source_title = Column(String)
    content_summary = Column(Text)
    retrieved_at = Column(DateTime, default=now_utc)
    reason_for_research = Column(Text)
    linked_test_id = Column(String, nullable=True)

    failure = relationship("Failure", back_populates="evidence_items")


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String, primary_key=True, default=gen_uuid)
    failure_id = Column(String, ForeignKey("failures.id"), nullable=True)
    intervention_type = Column(SAEnum(InterventionType))
    description = Column(Text, nullable=False)
    change_spec = Column(JSON)  # what actually changes (prompt diff, config delta, etc.)
    created_at = Column(DateTime, default=now_utc)

    failure = relationship("Failure", back_populates="interventions")
    experiments = relationship("Experiment", back_populates="intervention")


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String, primary_key=True, default=gen_uuid)
    intervention_id = Column(String, ForeignKey("interventions.id"), nullable=False)
    candidate_version_id = Column(String, ForeignKey("agent_versions.id"), nullable=False)
    baseline_version_id = Column(String, ForeignKey("agent_versions.id"), nullable=False)
    status = Column(SAEnum(ExperimentStatus), default=ExperimentStatus.PENDING)
    optimization_baseline = Column(Float)
    optimization_candidate = Column(Float)
    validation_baseline = Column(Float)
    validation_candidate = Column(Float)
    holdout_baseline = Column(Float)
    holdout_candidate = Column(Float)
    critical_failures_before = Column(Integer)
    critical_failures_after = Column(Integer)
    regression_count = Column(Integer, default=0)
    regression_details = Column(JSON)
    model_used = Column(String)
    latency_ms = Column(Integer)
    decision = Column(String)  # ACCEPTED | REJECTED | BLOCKED
    decision_reason = Column(Text)
    created_at = Column(DateTime, default=now_utc)
    completed_at = Column(DateTime, nullable=True)

    intervention = relationship("Intervention", back_populates="experiments")
    candidate_version = relationship("AgentVersion", foreign_keys=[candidate_version_id], back_populates="experiments")


class RegressionEvent(Base):
    __tablename__ = "regression_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    experiment_id = Column(String, ForeignKey("experiments.id"), nullable=False)
    test_case_id = Column(String, ForeignKey("test_cases.id"), nullable=False)
    regression_type = Column(String)  # NEWLY_FAILING | SCORE_DROP | CRITICAL_FAILURE
    description = Column(Text)
    created_at = Column(DateTime, default=now_utc)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_uuid)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    experiment_id = Column(String, ForeignKey("experiments.id"), nullable=True)
    evaluation_id = Column(String, ForeignKey("evaluation_runs.id"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(JSON)  # structured report sections
    created_at = Column(DateTime, default=now_utc)


class FailureReplay(Base):
    """Execution record of a reproduced/replayed test failure."""
    __tablename__ = "failure_replays"

    id = Column(String, primary_key=True, default=gen_uuid)
    failure_id = Column(String, ForeignKey("failures.id"), nullable=False)
    test_case_id = Column(String, ForeignKey("test_cases.id"), nullable=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    target_version = Column(String, default="v1.0")
    original_input = Column(Text, nullable=False)
    original_output = Column(Text, nullable=True)
    replayed_output = Column(Text, nullable=False)
    passed = Column(Boolean, default=False)
    original_score = Column(Float, default=0.0)
    replayed_score = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    tool_calls = Column(JSON, default=list)
    evaluator_notes = Column(Text, nullable=True)
    saved_as_regression_test = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_utc)

    agent = relationship("Agent", back_populates="replays")


class FailureCluster(Base):
    """Failure Genome cluster grouping recurring failure modes."""
    __tablename__ = "failure_clusters"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    category = Column(SAEnum(FailureCategory), default=FailureCategory.UNKNOWN)
    severity = Column(SAEnum(FailureSeverity), default=FailureSeverity.MEDIUM)
    description = Column(Text, nullable=False)
    failure_count = Column(Integer, default=1)
    recurrence_rate = Column(Float, default=0.0)
    affected_agents = Column(JSON, default=list)
    common_evidence = Column(Text, nullable=True)
    recommended_remediation = Column(Text, nullable=True)
    remediation_validated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_utc)


class DriftMonitor(Base):
    """Automated scheduled drift monitoring configuration and telemetry."""
    __tablename__ = "drift_monitors"

    id = Column(String, primary_key=True, default=gen_uuid)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    suite_id = Column(String, ForeignKey("test_suites.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    cadence = Column(String, default="daily")  # hourly | daily | weekly
    alert_threshold_pct = Column(Float, default=5.0)
    last_checked_at = Column(DateTime, nullable=True)
    baseline_reliability_score = Column(Float, default=64.0)
    latest_reliability_score = Column(Float, default=64.0)
    drift_detected = Column(Boolean, default=False)
    drift_summary = Column(Text, nullable=True)
    notification_webhook = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_utc)

    agent = relationship("Agent", back_populates="drift_monitors")


class DatasetImport(Base):
    """Test dataset import log with parsed case counts and column mappings."""
    __tablename__ = "dataset_imports"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    format = Column(String, default="csv")  # csv | json
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    column_mapping = Column(JSON, default=dict)
    sample_preview = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_utc)

