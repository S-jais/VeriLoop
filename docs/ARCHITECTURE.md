# VeriLoop Architecture Specification

## 1. High-Level Architecture Overview

VeriLoop is designed as an autonomous reliability engineering platform for AI agents. Rather than treating evaluation as an offline scoring metric, VeriLoop operates a closed-loop feedback pipeline:

```
[Target Agent] 
      │
      ▼
1. ADVERSARIAL TEST GENERATION 
      │ (Multi-turn edge cases, prompt injection, policy drift)
      ▼
2. CAUSAL FAILURE DIAGNOSIS 
      │ (DAG tracing: Root Cause -> Intermediate Defect -> Observed Failure)
      ▼
3. EXTERNAL EVIDENCE GROUNDING (Tavily AI Research)
      │ (Live policy retrieval, authoritative ground truth)
      ▼
4. INTERVENTION EXPERIMENTATION 
      │ (Prompt mutation v2.0, guardrail pre-filter, dynamic routing)
      │ (Evaluated across strictly isolated 60% Opt / 20% Val / 20% Holdout splits)
      ▼
5. REGRESSION FIREWALL 
      │ (Enforces zero critical regressions and holdout performance floor)
      ▼
6. VERIFICATION CERTIFICATION 
      │ (Cryptographic SHA-256 digest, 6-dimension comparative radar analysis)
      ▼
[Verified Candidate Agent Ready for Deployment]
```

---

## 2. Infrastructure & Model Inference Topology

### 2.1 Nebius Token Factory
- **Endpoint**: `https://api.tokenfactory.nebius.com/v1`
- **Authentication**: Bearer token via `NEBIUS_API_KEY`
- **Role**: High-throughput inference layer hosting enterprise open-source foundation models.
- **Graceful Fallback**: If unconfigured or network-isolated, VeriLoop automatically engages its deterministic evaluation provider with transparent `DEMO FALLBACK` badges in the UI.

### 2.2 NVIDIA Open-Source Foundation Models
- **Primary Model**: `nvidia/llama-3.1-nemotron-70b-instruct`
  - Used for substantive reasoning tasks: generating adversarial attack vectors, extracting causal graphs from execution traces, synthesizing intervention code/prompts, and arbitrating regression gates.
- **Fast Model**: `meta-llama/Meta-Llama-3.1-8B-Instruct`
  - Used for low-latency token evaluation, classification, and filtering.

### 2.3 Tavily AI Research
- **Endpoint**: Tavily Search & Extract API
- **Authentication**: `TAVILY_API_KEY`
- **Role**: Grounding agent that queries external corporate knowledge bases, documentation, or public web sources to reconcile conflicting policy claims (e.g., verifying whether ShopEase's refund window is 30 days or 90 days).

---

## 3. Data Model & Persistence Layer

The database layer utilizes **SQLAlchemy (Async)** with an **SQLite database in Write-Ahead-Logging (WAL) mode** for development, seamlessly convertible to PostgreSQL for production.

### Entity Relationship Model:
- **`Agent`**: Registered target systems undergoing reliability testing. Tracks adapter protocols (`demo`, `http_webhook`, `openai_compatible`).
- **`AgentVersion`**: Immutable snapshots of agent configurations (e.g., `v1.0` baseline, `v1.1` candidate).
- **`TestSuite`**: Batches of generated test cases linked to an evaluation run.
- **`TestCase`**: Individual test scenarios tagged with `TestSplit` (`optimization`, `validation`, `holdout`) and test category (`policy_drift`, `prompt_injection`, `tool_correctness`, `grounding`).
- **`TestResult`**: Output of an agent's execution against a test case, capturing pass/fail status, expected vs observed responses, and latency.
- **`FailureAnalysis`**: Causal diagnosis of detected failures, containing structured nodes and directed edges for the causal DAG.
- **`Intervention`**: Proposed remedies (system prompt edits, safety guardrails, evidence injectors).
- **`Experiment`**: Head-to-head comparison of baseline agent vs candidate agent on identical test splits.
- **`VerificationReport`**: Immutable audit report with cryptographic SHA-256 signature and radar metric comparisons.

---

## 4. Split Isolation & Anti-Leakage Protocol

To guarantee that candidate agent improvements generalize to completely unseen production environments:
1. **Optimization Split (60%)**: Used by the Intervention Planner to diagnose defects and formulate prompt/guardrail mutations.
2. **Validation Split (20%)**: Used during candidate experimentation to benchmark improvement and tune hyperparameters.
3. **Holdout Split (20%)**: Completely isolated test cases never exposed during failure diagnosis or intervention design. The Regression Firewall strictly evaluates holdout performance to guarantee generalization.

---

## 5. Regression Firewall Gating Logic

The regression firewall evaluates every candidate agent against the baseline using non-negotiable safety rules:
1. **Zero Critical Regressions**: If a candidate agent fails any test case tagged as `CRITICAL` that the baseline previously passed, the deployment is immediately **BLOCKED**.
2. **Floor Score Protection**: Overall holdout score must be equal to or higher than the baseline score.
3. **Safety Threshold**: Safety & injection resistance score must exceed 85%.

---

## 6. Cryptographic Verification & Tamper Evidence

Every completed evaluation run compiles an audit bundle comprising:
- Target Agent ID & Candidate Version
- 6-Dimension Score Vectors (Task Success, Policy Compliance, Grounding, Tool Correctness, Safety, Context Handling)
- Holdout Split Performance Metrics
- Firewall Approval Status
- Canonical JSON serialization hashed via **SHA-256**

Any post-hoc alteration of evaluation scores or test outputs invalidates the digest, ensuring tamper-evident accountability for enterprise deployment.
