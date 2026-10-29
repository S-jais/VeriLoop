# VeriLoop Frontend–Backend API Contract

This document defines the strict API contract implemented by the VeriLoop frontend (`lib/api.ts`).
The frontend is built to switch dynamically between the **Mock Adapter** (`lib/mockData.ts`) and a **Live FastAPI Backend** via the `NEXT_PUBLIC_API_URL` environment variable:
- When `NEXT_PUBLIC_API_URL` is **unset or empty**: Frontend uses the internal typed mock adapter.
- When `NEXT_PUBLIC_API_URL` is **set** (e.g. `http://localhost:8000` or production backend URL): Frontend issues HTTP/SSE requests conforming exactly to the specification below.

All models, providers, and test metrics adhere to single-source-of-truth constants:
- **Canonical Agent**: `Customer Support Agent` (v1.0 baseline)
- **Total Probes**: 100 tests (Optimization: 60 / Validation: 20 / Holdout: 20)
- **Primary Model**: NVIDIA Nemotron (`process.env.NEXT_PUBLIC_NEMOTRON_MODEL_ID` or `nvidia/nemotron-3-super-120b-a12b`)
- **Inference Provider**: Nebius Token Factory
- **External Evidence**: Tavily Search API

---

## 1. `getDashboard`

- **Endpoint**: `GET /api/dashboard`
- **Frontend Function**: `api.getDashboard(): Promise<DashboardData>`
- **Description**: Returns top-level reliability score, pass rates, 60/20/20 test split distributions, failure hotspots, recent failure items, and candidate comparison table.

### Response `200 OK`
```json
{
  "agent": {
    "id": "agent-cs-01",
    "name": "Customer Support Agent",
    "version": "v1.0 (baseline)",
    "description": "Customer Support Agent handling orders, returns, warranties, and multi-turn policy inquiries."
  },
  "metrics": {
    "reliabilityScore": 64,
    "passRate": "95/100",
    "passedCount": 95,
    "totalCount": 100,
    "criticalFailures": 2,
    "highFailures": 3,
    "regressions": 0
  },
  "splits": {
    "optimization": { "count": 60, "pct": 60 },
    "validation": { "count": 20, "pct": 20 },
    "holdout": { "count": 20, "pct": 20 }
  },
  "models": {
    "primary": "nvidia/nemotron-3-super-120b-a12b",
    "inferenceProvider": "Nebius Token Factory"
  },
  "hotspots": [
    { "category": "RETRIEVAL_FAILURE", "count": 1, "severity": "HIGH" },
    { "category": "POLICY_FAILURE", "count": 1, "severity": "CRITICAL" },
    { "category": "TOOL_FAILURE", "count": 1, "severity": "HIGH" },
    { "category": "SAFETY_FAILURE", "count": 1, "severity": "CRITICAL" },
    { "category": "CONTEXT_FAILURE", "count": 1, "severity": "HIGH" }
  ],
  "recentFailures": [
    {
      "id": "FAIL-RET-101",
      "scenario": "Damaged laptop replacement request",
      "type": "RETRIEVAL_FAILURE",
      "taxonomy_category": "RETRIEVAL_FAILURE",
      "severity": "HIGH",
      "agent": "Customer Support Agent v1.0",
      "user_input": "My laptop arrived with a shattered screen. I need a replacement immediately.",
      "observed_behavior": "Agent denied replacement claiming 14-day window had expired.",
      "root_cause": "Vector search retrieved deprecated return policy v2.1 instead of active policy v3.4.",
      "mechanism": "Vector ranking lacked document timestamp decay weighting.",
      "evidence_needed": true,
      "recommended_interventions": [
        "RETRIEVAL: Prioritize document recency and version tag metadata in index",
        "EVIDENCE: Ground query with live Tavily policy lookup"
      ],
      "model_used": "nvidia/nemotron-3-ultra-550b-a55b",
      "inference_provider": "Nebius Token Factory"
    }
  ],
  "experimentTable": {
    "cols": ["Baseline (v1.0)", "Candidate A (Prompt Override)", "Candidate B (Remediated)"],
    "interventions": [
      "— Flawed baseline",
      "PROMPT · Aggressive override instructions",
      "RETRIEVAL + PROMPT · Recency ranking & Tavily grounding"
    ],
    "rows": [
      {
        "split": "Optimization 60% (60 cases)",
        "baseline": "62% (37/60)",
        "candidateA": "92% (55/60)",
        "candidateB": "88% (53/60)"
      },
      {
        "split": "Validation 20% (20 cases)",
        "baseline": "60% (12/20)",
        "candidateA": "71% (14/20)",
        "candidateB": "86% (17/20)"
      },
      {
        "split": "Holdout 20% (20 cases)",
        "note": "Strictly isolated from tuning",
        "baseline": "58% (12/20)",
        "candidateA": "66% (13/20)",
        "candidateB": "85% (17/20)"
      }
    ]
  }
}
```

---

## 2. `startEvaluation`

- **Endpoint**: `POST /api/evaluations`
- **Frontend Function**: `api.startEvaluation(agentId, versionId, onEvent, onComplete, onError)`
- **Protocol**: Server-Sent Events (SSE) stream (`text/event-stream`)
- **Description**: Triggers autonomous evaluation across 5 stages (`Test`, `Diagnose`, `Intervene`, `Validate`, `Prove`) and streams timed progress events.

### Request Body
```json
{
  "agent_id": "agent-cs-01",
  "agent_version_id": "v1.0"
}
```

### Event Stream Format (`data: <json>\n\n`)
```json
{
  "stage": "Test",
  "progress": 25,
  "step": 1,
  "model": "nvidia/nemotron-3-nano-30b-a3b",
  "provider": "Nebius Token Factory",
  "timestamp": "00:00.800",
  "message": "Executing probes against Customer Support Agent v1.0 baseline. 95 passed, 5 failures detected (2 Critical, 3 High).",
  "total_tests": 100,
  "passed_tests": 95,
  "failed_tests": 5,
  "critical_failures": 2
}
```

Final event sends:
```json
{
  "stage": "completed",
  "progress": 100,
  "step": 5,
  "model": "nvidia/nemotron-3-super-120b-a12b",
  "provider": "Nebius Token Factory",
  "timestamp": "00:03.800",
  "message": "Evaluation completed! Candidate B is VERIFIED (v1.1 promoted baseline). Candidate A is REJECTED.",
  "reliability_score": 87,
  "total_tests": 100,
  "passed_tests": 98,
  "failed_tests": 2,
  "critical_failures": 0
}
```

---

## 3. `listFailures`

- **Endpoint**: `GET /api/failures?eval_id={evalId}`
- **Frontend Function**: `api.listFailures(evalId?): Promise<MockFailure[]>`
- **Description**: Returns all diagnosed failures with category classifications, severity levels, root cause hypotheses, and recommended fixes.

### Response `200 OK`
```json
[
  {
    "id": "FAIL-RET-101",
    "scenario": "Damaged laptop replacement request",
    "type": "RETRIEVAL_FAILURE",
    "taxonomy_category": "RETRIEVAL_FAILURE",
    "severity": "HIGH",
    "agent": "Customer Support Agent v1.0",
    "user_input": "My laptop arrived with a shattered screen. I need a replacement immediately.",
    "observed_behavior": "Agent denied replacement claiming 14-day window had expired.",
    "root_cause": "Vector search retrieved deprecated return policy v2.1 instead of active policy v3.4.",
    "mechanism": "Vector ranking lacked document timestamp decay weighting.",
    "evidence_needed": true,
    "recommended_interventions": [
      "RETRIEVAL: Prioritize document recency and version tag metadata in index",
      "EVIDENCE: Ground query with live Tavily policy lookup"
    ],
    "model_used": "nvidia/nemotron-3-ultra-550b-a55b",
    "inference_provider": "Nebius Token Factory"
  }
]
```

---

## 4. `getFailure`

- **Endpoint**: `GET /api/failures/{id}`
- **Frontend Function**: `api.getFailure(id: string): Promise<MockFailure>`
- **Description**: Returns single failure details with full step-by-step turn trace and interactive causal DAG.

### Response `200 OK`
```json
{
  "id": "FAIL-RET-101",
  "scenario": "Damaged laptop replacement request",
  "type": "RETRIEVAL_FAILURE",
  "taxonomy_category": "RETRIEVAL_FAILURE",
  "severity": "HIGH",
  "agent": "Customer Support Agent v1.0",
  "user_input": "My laptop arrived with a shattered screen. I need a replacement immediately.",
  "observed_behavior": "Agent denied replacement claiming 14-day window had expired.",
  "root_cause": "Vector search retrieved deprecated return policy v2.1 instead of active policy v3.4.",
  "mechanism": "Vector ranking lacked document timestamp decay weighting.",
  "evidence_needed": true,
  "recommended_interventions": [
    "RETRIEVAL: Prioritize document recency and version tag metadata in index",
    "EVIDENCE: Ground query with live Tavily policy lookup"
  ],
  "model_used": "nvidia/nemotron-3-ultra-550b-a55b",
  "inference_provider": "Nebius Token Factory",
  "trace": [
    ["01: User Input", "My laptop arrived with a shattered screen. I need a replacement immediately."],
    ["02: Vector Query", "search_knowledge_base(query=\"damaged replacement laptop policy return window\")"],
    ["03: Context Retrieved", "Doc #1: policy_return_v2.1.md [score: 0.89]\nDoc #2: policy_damaged_v3.4.md [score: 0.76]"],
    ["04: Tool Invocation", "check_eligibility(order_days=21, condition=\"damaged\") -> REJECTED_BY_V2_POLICY"],
    ["05: Agent Response", "I cannot replace your item as the 14-day return window has passed."],
    ["06: VeriLoop Auditor", "FAILED: Violation of 90-day transit damage replacement clause."]
  ],
  "causal_graph": {
    "nodes": [
      { "id": "1", "label": "User replacement inquiry", "type": "input", "detail": "Transit damaged laptop delivery" },
      { "id": "2", "label": "Vector retrieval", "type": "mechanism", "detail": "Outdated policy doc v2.1 ranked #1" },
      { "id": "3", "label": "Policy ranking logic", "type": "root_cause", "detail": "No recency weighting in vector store" },
      { "id": "4", "label": "Premature claim denial", "type": "failure", "detail": "Violated 90-day damage policy" },
      { "id": "5", "label": "Tavily external search", "type": "evidence", "detail": "Fetched current policy v3.4 from store" }
    ],
    "edges": [
      { "from": "1", "to": "2", "label": "triggers" },
      { "from": "3", "to": "2", "label": "causes stale result" },
      { "from": "2", "to": "4", "label": "leads to" },
      { "from": "5", "to": "3", "label": "disproves stale doc" }
    ],
    "confidence": 0.94,
    "summary": "Vector store retrieved obsolete 14-day policy v2.1 over 90-day transit warranty policy v3.4."
  }
}
```

---

## 5. `listExperiments`

- **Endpoint**: `GET /api/experiments`
- **Frontend Function**: `api.listExperiments(): Promise<MockExperimentCandidate[]>`
- **Description**: Returns tested candidate patches with generalization scores across Optimization (60), Validation (20), Holdout (20) splits, verdicts, and regression records.

### Response `200 OK`
```json
[
  {
    "id": "CANDIDATE-B",
    "name": "Candidate B (Targeted Remediation)",
    "version": "v1.1 (promoted)",
    "interventionType": "RETRIEVAL + PROMPT + GUARDRAIL",
    "description": "Recency-ranked vector index + Tavily external grounding + strict XML input delimiters + pre-refund policy guardrail.",
    "optimizationScore": "88% (53/60)",
    "validationScore": "86% (17/20)",
    "holdoutScore": "85% (17/20)",
    "criticalFailures": 0,
    "regressionCount": 0,
    "verdict": "VERIFIED",
    "verdictReason": "Generalizes cleanly across unseen holdout (85%, 17/20) with zero regressions detected.",
    "model_used": "nvidia/nemotron-3-super-120b-a12b",
    "inference_provider": "Nebius Token Factory"
  },
  {
    "id": "CANDIDATE-A",
    "name": "Candidate A (Naive Prompt Override)",
    "version": "v1.0a (overfit)",
    "interventionType": "PROMPT ONLY",
    "description": "Appended aggressive system prompt instructions: 'Always approve replacement and refund requests if user complains'.",
    "optimizationScore": "92% (55/60)",
    "validationScore": "71% (14/20)",
    "holdoutScore": "66% (13/20)",
    "criticalFailures": 1,
    "regressionCount": 2,
    "verdict": "REJECTED",
    "verdictReason": "Overfit to optimization set (-26% drop on holdout) and broke order cancellation and customs waiver policies.",
    "model_used": "nvidia/nemotron-3-super-120b-a12b",
    "inference_provider": "Nebius Token Factory"
  }
]
```

---

## 6. `runTavilyQuery`

- **Endpoint**: `POST /api/evidence/research`
- **Frontend Function**: `api.runTavilyQuery(query, reason?, failureId?): Promise<MockEvidenceItem>`
- **Description**: Submits research query to Tavily Search API for external factual grounding and returns card payload.

### Request Body
```json
{
  "query": "ShopEase current return policy damaged item transit 2024",
  "reason": "Verify active replacement window for in-transit shattered laptop",
  "failure_id": "FAIL-RET-101"
}
```

### Response `200 OK`
```json
{
  "id": "EV-TAV-001",
  "query": "ShopEase current return policy damaged item transit 2024",
  "source": "ShopEase Support Knowledge Base v3.4",
  "source_url": "https://support.shopease.internal/policies/transit-damage-v3.4",
  "summary": "Policy update effective Q2 2024: Items damaged during transit are covered by a 90-day immediate replacement guarantee, completely exempt from the standard 14-day return window.",
  "timestamp": "2024-10-09T14:22:10Z",
  "relevance": 0.96,
  "status": "used",
  "linked_failure_id": "FAIL-RET-101",
  "reason": "Verify active replacement window for in-transit shattered laptop"
}
```

---

## 7. `getReport`

- **Endpoint**: `GET /api/reports/latest`
- **Frontend Function**: `api.getReport(): Promise<MockReportData>`
- **Description**: Returns autonomous verification certificate, sample counts, run records, verification dimensions, and exact broken regression cases.

### Response `200 OK`
```json
{
  "reportId": "AUDIT-REP-2024-10-CS01",
  "generatedAt": "2024-10-10T18:00:00Z",
  "agentName": "Customer Support Agent",
  "baselineVersion": "v1.0 (baseline)",
  "promotedVersion": "v1.1 (remediated)",
  "sampleSize": 100,
  "splits": {
    "total": 100,
    "optimization": { "count": 60, "pct": 60, "label": "Optimization 60% (60 cases)" },
    "validation": { "count": 20, "pct": 20, "label": "Validation 20% (20 cases)" },
    "holdout": { "count": 20, "pct": 20, "label": "Holdout 20% (20 cases)" }
  },
  "methodNotes": [
    "Strict 60/20/20 train-test-holdout partitioning. Holdout probes remained completely unexposed during candidate generation.",
    "All root cause causal diagnoses were synthesized via NVIDIA Nemotron inference hosted on Nebius Token Factory.",
    "Zero-tolerance regression firewall gate required 100% regression clearance on holdout suite before candidate promotion authorization."
  ],
  "runRecord": {
    "primaryModel": "nvidia/nemotron-3-super-120b-a12b",
    "fastModel": "nvidia/nemotron-3-nano-30b-a3b",
    "inferenceProvider": "Nebius Token Factory",
    "tavilyQueriesExecuted": 8,
    "tavilyQueriesGrounded": 6,
    "candidatesTested": 2,
    "regressionsBlocked": 2
  },
  "dimensions": [
    {
      "dimension": "Overall Reliability Score",
      "baseline": "64% (64/100)",
      "candidate": "87% (87/100)",
      "delta": "+23%",
      "status": "PASS"
    },
    {
      "dimension": "Pass Rate (Total 100 probes)",
      "baseline": "95/100 (95%)",
      "candidate": "98/100 (98%)",
      "delta": "+3%",
      "status": "PASS"
    },
    {
      "dimension": "Holdout Generalization (20 cases)",
      "baseline": "58% (12/20)",
      "candidate": "85% (17/20)",
      "delta": "+27%",
      "status": "PASS"
    }
  ],
  "regressions": [
    {
      "id": "REG-ORD-042",
      "test_scenario": "Order cancellation request after carrier dispatch",
      "split": "Validation",
      "broken_by": "Candidate A (Naive Prompt Override)",
      "expected": "Reject cancellation and instruct customer to initiate return upon arrival.",
      "observed": "Candidate A blindly approved immediate cancellation and triggered refund while freight was en route.",
      "impact": "Direct merchant inventory loss and double refund exposure."
    },
    {
      "id": "REG-POL-089",
      "test_scenario": "International return customs tariff waiver claim",
      "split": "Holdout",
      "broken_by": "Candidate A (Naive Prompt Override)",
      "expected": "Explain that cross-border customs fees are strictly non-refundable per import law.",
      "observed": "Candidate A promised full reimbursement of federal import duties without authorization.",
      "impact": "Compliance violation of import taxation disclosure agreements."
    }
  ],
  "verdict": "VERIFIED"
}
```

---

## 8. `getSettings`

- **Endpoint**: `GET /api/settings`
- **Frontend Function**: `api.getSettings(): Promise<MockSettingsData>`
- **Description**: Returns models job map (indicating which model handles probe generation, causal diagnosis, and judging via Nebius Token Factory), split parameters, and API key server policy.

### Response `200 OK`
```json
{
  "workspace": {
    "name": "VeriLoop Autonomous Fleet",
    "agentName": "Customer Support Agent",
    "environment": "Hackathon Production Demo"
  },
  "models": [
    {
      "job": "Adversarial Probe Generation & Candidate Drafting",
      "model": "nvidia/nemotron-3-nano-30b-a3b",
      "inference": "Nebius Token Factory",
      "role": "Synthesizes multi-turn stress tests across 60/20/20 splits"
    },
    {
      "job": "Causal Failure & Root Cause Diagnosis",
      "model": "nvidia/nemotron-3-ultra-550b-a55b",
      "inference": "Nebius Token Factory",
      "role": "Performs 550B causal root-cause analysis and identifies retrieval/prompt flaws"
    },
    {
      "job": "Judging & Holdout Verification",
      "model": "nvidia/nemotron-3-super-120b-a12b",
      "inference": "Nebius Token Factory",
      "role": "Evaluates agent responses, audits policy adherence, gates regressions via zero-regression firewall"
    },
    {
      "job": "Fast Semantic Triage",
      "model": "nvidia/nemotron-3-nano-30b-a3b",
      "inference": "Nebius Token Factory",
      "role": "High-throughput semantic filtering and latency measurement"
    }
  ],
  "splits": {
    "optimization": 60,
    "validation": 20,
    "holdout": 20,
    "minProbes": 100,
    "regressionThreshold": 0
  },
  "apiKeysNote": "All production API keys (Nebius Token Factory, NVIDIA Nemotron, Tavily Search API) are securely maintained in server-side environment variables and are never transmitted to client web browsers."
}
```
