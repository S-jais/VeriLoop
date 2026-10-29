# VeriLoop Comprehensive Codebase & Data Flow Audit (AUDIT.md)
*Created: 2026-10-11 | Hackathon Track: Coding and Agentic Engineering*

This document establishes the empirical audit of the VeriLoop full-stack codebase prior to any refactoring. Nothing in this document is assumed; all details are verified directly from source code and runtime inspection.

---

## 1. Full Repository File Tree

```
VeriLoop/
├── .env.example                          # Root environment template (secrets excluded)
├── .gitignore                            # Ignores .env, .env.*, db, node_modules, build artifacts
├── API_CONTRACT.md                       # REST and SSE API contract specification
├── AUDIT.md                              # This empirical audit file
├── LICENSE                               # MIT License
├── README.md                             # Project overview and hackathon documentation
├── package.json                          # Root workspace package scripts
├── veriloop.db                           # Local SQLite database (git-ignored)
│
├── backend/
│   ├── .env                              # Server environment variables (git-ignored)
│   ├── .env.example                      # Template for backend server variables
│   ├── Dockerfile                        # Backend container configuration
│   ├── requirements.txt                  # Python dependencies (fastapi, uvicorn, sqlalchemy, etc.)
│   ├── app/
│   │   ├── main.py                       # FastAPI application entrypoint, CORS, routes, lifespan
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── agents.py             # Agent CRUD and versioning
│   │   │       ├── demo.py               # Demo seed and reset endpoints
│   │   │       ├── evaluations.py        # SSE evaluation streaming and history
│   │   │       ├── evidence.py           # Tavily research queries and grounding items
│   │   │       ├── experiments.py        # Interventions, 3-split runs, candidate promotion
│   │   │       ├── failures.py           # Failure details, causal graphs, traces
│   │   │       └── system.py             # /health, /info, /models
│   │   ├── core/
│   │   │   ├── config.py                 # Pydantic Settings, environment validation
│   │   │   └── nebius_provider.py        # Nebius Token Factory OpenAI-compatible client
│   │   ├── db/
│   │   │   ├── database.py               # Async SQLAlchemy engine & session factory
│   │   │   └── models.py                 # Relational schemas (Agent, EvaluationRun, Failure, etc.)
│   │   ├── prompts/                      # Prompt templates for test generation & diagnosis
│   │   └── services/
│   │       ├── evaluation_engine.py      # Test execution engine
│   │       ├── failure_analyzer.py       # Causal failure diagnosis & root cause attribution
│   │       ├── intervention_engine.py    # Candidate fix generators & RegressionFirewall
│   │       ├── orchestrator.py           # 5-stage loop pipeline orchestrator
│   │       ├── tavily_service.py         # Tavily external research integration
│   │       └── test_generation.py        # 60/20/20 test suite probe generator
│   └── tests/
│
└── frontend/
    ├── package.json                      # Next.js 16, React 19, Lucide, Tailwind, React Query
    ├── next.config.ts                    # Reverse proxy rewrites for /api/* -> Render backend
    ├── tailwind.config.js                # Theme tokens, custom colors, dark teal palette
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx                # App root layout, QueryProvider, font setup
    │   │   ├── globals.css               # Design system tokens, utilities, animations
    │   │   ├── page.tsx                  # Landing page with WebGL Plasma vortex hero
    │   │   ├── landing/page.tsx          # Standalone landing page route
    │   │   ├── dashboard/page.tsx        # Central reliability score, metrics, hotspots, experiments
    │   │   ├── failures/page.tsx         # Diagnosed failures, 5-node causal trace, inspection
    │   │   ├── experiments/page.tsx      # Candidate intervention comparison, 60/20/20 breakdown
    │   │   ├── regression/page.tsx       # Holdout regression firewall, blocked cases
    │   │   ├── reports/page.tsx          # Verification report certificate & export (MD/JSON/Print)
    │   │   ├── evidence/page.tsx         # Interactive Tavily research grounding cards
    │   │   ├── settings/page.tsx         # Model job allocations, inference settings, security note
    │   │   ├── login/page.tsx            # Login with Quick Demo Access for hackathon judges
    │   │   ├── signup/page.tsx           # Account registration flow
    │   │   ├── agents/page.tsx           # Agent fleet registry and lineage
    │   │   └── evaluations/page.tsx      # Multi-stage evaluation history and runner
    │   ├── components/
    │   │   ├── AppShell.tsx              # Application layout wrapper with sidebar and header
    │   │   ├── Navigation.tsx            # Desktop sidebar and mobile navigation drawer
    │   │   ├── TopBar.tsx                # Breadcrumbs, honest live indicator, palette trigger
    │   │   ├── VeriLoopCore.tsx          # WebGL plasma shader, step cycle, ticker, hero counters
    │   │   └── CommandPalette.tsx        # ⌘K Command palette for fast navigation
    │   └── lib/
    │       ├── api.ts                    # Typed API client, adapter switching, SSE streamer
    │       ├── config.ts                 # Model IDs, inference providers, canonical splits
    │       └── mockData.ts               # Standalone mock adapter seed data
```

---

## 2. Page-by-Page Data Origin Audit

| Page Route | Component File | Primary Data Source | Fallback / Mechanism | Hardcoded Elements Detected |
|---|---|---|---|---|
| `/` (Landing) | `app/page.tsx` & `VeriLoopCore.tsx` | Local component state | N/A | Hero stats counters `{ p: 100, f: 5, v: 1 }` in `VeriLoopCore.tsx` lines 204 & 855; 8 failure mode cards with empty bodies in `page.tsx` line 175. |
| `/dashboard` | `app/dashboard/page.tsx` | `api.getDashboard()` | Mock adapter (`mockData.ts`) when backend returns 404 | Regressions counter in JSX line 250 (`0`); Experiment comparison table lines 350-380 has hardcoded cells (`62%`, `92%`, `88%`, etc.). |
| `/failures` | `app/failures/page.tsx` | `api.listFailures()` | Duplicate `SEED_FAILURES` array (lines 12-111) | Duplicated copy of failures inside component file; hardcoded trace steps if backend trace is missing. |
| `/experiments` | `app/experiments/page.tsx` | `api.listExperiments()` | Mock adapter (`mockData.ts`) | Generalization Split Breakdown table lines 326-360 hardcoded HTML; Generalization Check badges lines 374-389 hardcoded strings. |
| `/regression` | `app/regression/page.tsx` | `api.listExperiments()` | Mock adapter (`mockData.ts`) | Baseline version "v1.0 (baseline)" and Candidate "v1.1 (Targeted Remediation)"; Blocked cases cards lines 126-151 hardcoded. |
| `/reports` | `app/reports/page.tsx` | `api.getReport()` | Mock adapter (`mockData.ts`) | Hardcoded report ID `AUDIT-REP-2024-10-CS01` and date `2024-10` in mock seed; hardcoded summary copy text. |
| `/evidence` | `app/evidence/page.tsx` | `api.listEvidence()`, `api.runTavilyQuery()` | Mock adapter (`mockData.ts`) | Default failure ID `'FAIL-RET-101'` hardcoded in sample query trigger. |
| `/settings` | `app/settings/page.tsx` | `api.getSettings()` | Mock adapter (`mockData.ts`) | Server secrets status table lines 257-276 hardcoded HTML. |
| `/agents` | `app/agents/page.tsx` | `api.listAgents()`, `api.demoStatus()` | Local mock in `api.ts` | Single hardcoded agent `'agent-cs-01'`. |
| `/evaluations` | `app/evaluations/page.tsx` | `api.listEvaluations()`, `api.demoStatus()` | Local mock in `api.ts` | Single hardcoded evaluation run. |
| `/login` | `app/login/page.tsx` | Local state | N/A | Mock credentials `'hackathon.judge@veriloop.ai'`. |
| `/signup` | `app/signup/page.tsx` | Local state | N/A | Mock profile pre-fill `'Alex Morgan'`. |

---

## 3. Backend Endpoints Catalog

The backend is built with FastAPI in `backend/app`. All registered routes and their implementations:

| HTTP Method | Route Path | Router Module | Description | Backend Implemented? | Frontend Called? |
|---|---|---|---|---|---|
| `GET` | `/api/system/health` | `routes/system.py` | Health status and provider configuration flags | Yes | Yes (Settings/Health) |
| `GET` | `/api/system/info` | `routes/system.py` | Product version, model stack details | Yes | Optional |
| `GET` | `/api/system/models` | `routes/system.py` | Queries Nebius Token Factory for live models | Yes | Yes (Settings) |
| `POST` | `/api/evaluations` | `routes/evaluations.py` | Starts 5-stage evaluation and streams SSE events | Yes | Yes (`api.startEvaluation`) |
| `GET` | `/api/evaluations` | `routes/evaluations.py` | Lists recent evaluation runs | Yes | Yes (`api.listEvaluations`) |
| `GET` | `/api/evaluations/{eval_id}` | `routes/evaluations.py` | Gets details for specific evaluation | Yes | Yes |
| `GET` | `/api/failures` | `routes/failures.py` | Lists diagnosed failure items | Yes | Yes (`api.listFailures`) |
| `GET` | `/api/failures/{failure_id}` | `routes/failures.py` | Returns single failure with causal graph & trace | Yes | Yes (`api.getFailure`) |
| `POST` | `/api/experiments` | `routes/experiments.py` | Executes candidate intervention across splits | Yes | Yes (`api.runExperiment`) |
| `GET` | `/api/experiments` | `routes/experiments.py` | Lists completed candidate experiments | Yes | Yes (`api.listExperiments`) |
| `GET` | `/api/experiments/interventions` | `routes/experiments.py` | Lists intervention catalog | Yes | Yes |
| `GET` | `/api/experiments/{id}` | `routes/experiments.py` | Gets details of single experiment | Yes | Yes |
| `POST` | `/api/experiments/{id}/promote` | `routes/experiments.py` | Promotes accepted candidate to baseline | Yes | Yes |
| `POST` | `/api/evidence/research` | `routes/evidence.py` | Executes Tavily search query and persists evidence | Yes | Yes (`api.runTavilyQuery`) |
| `GET` | `/api/evidence` | `routes/evidence.py` | Lists retrieved evidence items | Yes | Yes (`api.listEvidence`) |
| `GET` | `/api/demo/status` | `routes/demo.py` | Returns demo agent status and latest evaluation | Yes | Yes (`api.demoStatus`) |
| `POST` | `/api/demo/reset` | `routes/demo.py` | Resets database to initial baseline | Yes | Yes (`api.resetDemo`) |
| `GET` | `/api/agents` | `routes/agents.py` | Lists agents | Yes | Yes |
| `POST` | `/api/agents` | `routes/agents.py` | Registers agent | Yes | No |
| `GET` | `/api/agents/{id}` | `routes/agents.py` | Gets agent details | Yes | No |
| `POST` | `/api/agents/{id}/versions` | `routes/agents.py` | Registers agent version | Yes | No |
| **GET** | **/api/dashboard** | **MISSING** | Aggregate dashboard payload | **No** (frontend calls, 404s) | Yes |
| **GET** | **/api/reports/latest** | **MISSING** | Verification report certificate | **No** (frontend calls, 404s) | Yes |
| **GET** | **/api/settings** | **MISSING** | Settings & provider metadata | **No** (frontend calls, 404s) | Yes |
| **GET** | **/health** | **MISSING** | Root health check alias required by Phase 2.5 | **No** (only `/api/system/health`) | Phase 2 requirement |

---

## 4. Origin of Every Number on Screen & Identified Inconsistencies

### A. Number Origin Audit
1. **Reliability Score (`64% FAIL`)**:
   - Origin: `mockData.ts` line 24 & `CANONICAL_EXPERIMENTS.baseline.reliabilityScore`.
   - Formula: Severity-weighted penalty index over 100 test probes.
2. **Pass Rate (`95/100` or `95%`)**:
   - Origin: `mockData.ts` line 25 (`passedCount: 95, totalCount: 100`).
   - Meaning: 95 probes passed out of 100 total probes.
   - **Conflict**: 95% pass rate displayed next to 64% FAIL without explicit formula explanation leads judges to perceive a contradiction.
3. **Failure Hotspots (`5 DETECTED`)**:
   - Origin: `mockData.ts` line 41 (`hotspots` array with 5 items).
   - Categories: `RETRIEVAL_FAILURE: 1`, `POLICY_FAILURE: 1`, `TOOL_FAILURE: 1`, `SAFETY_FAILURE: 1`, `CONTEXT_FAILURE: 1`.
   - **Conflict**: In the dashboard, 7 categories were rendered from `TAXONOMY_CATEGORIES`. Because only 5 were in the hotspot list, some categories displayed `0` while the header claimed 5 detected, creating confusion.
4. **Recent Failures Count**:
   - Origin: 5 failures (`FAIL-RET-101`, `FAIL-POL-102`, `FAIL-TOL-103`, `FAIL-SAF-104`, `FAIL-CTX-105`).
5. **Generalization Splits (`60 / 20 / 20`)**:
   - Origin: `CANONICAL_SPLITS` in `config.ts` (60 optimization, 20 validation, 20 holdout = 100 total).
6. **Split Test Results**:
   - Baseline: Opt `62% (37/60)`, Val `60% (12/20)`, Holdout `58% (12/20)`. Sum passed = `37 + 12 + 12 = 61` (or in pass rate 95 passed).
   - **Conflict**: Baseline pass rate in top card is `95/100`, but split table shows `37 + 12 + 12 = 61/100` passed! This is a direct mathematical contradiction.
7. **Candidate A Results**:
   - Opt `92% (55/60)`, Val `71% (14/20)`, Holdout `66% (13/20)` with 2 regressions (`REG-ORD-042`, `REG-POL-089`).
8. **Candidate B Results**:
   - Opt `88% (53/60)`, Val `86% (17/20)`, Holdout `85% (17/20)` with 0 regressions.
9. **Report Dimensions**:
   - Task Completion: `64%` -> `87%` (+23%).
   - Holdout Generalization: `58%` -> `85%` (+27%).
   - Sample size: `17/20` on holdout.
10. **Report Timestamp & Version**:
    - Timestamp in mock: `2024-10-14T09:30:00Z` (outdated by 2 years).
    - Versions: "Candidate v1.1" vs "Candidate B" vs "Promoted candidate".
11. **Regression Categorization**:
    - Labeled "2 critical" in one component and "2 policy" in another. Real taxonomy: 2 policy regressions.

---

## 5. Security & Secret Exposure Audit

- **Git History Scan**: Executed `git log -p -- "*.env*"` across entire commit history.
  - Result: Only `.env.example` templates committed. No real API keys or tokens have ever been committed to git.
- **Client Code Scan**:
  - `NEBIUS_API_KEY` and `TAVILY_API_KEY` are read exclusively in backend server files (`backend/app/core/config.py`, `nebius_provider.py`, `tavily_service.py`).
  - No `NEXT_PUBLIC_` secret keys exist in the frontend.
  - Frontend only accesses backend via reverse proxy rewrites (`/api/*`) or backend URL.
- **Vercel / Render Alignment**:
  - Backend deployed on Render (`https://veriloop.onrender.com`).
  - Frontend deployed on Vercel (`https://veriloop.vercel.app`).
  - Reverse proxy rewrite in `next.config.ts` proxies `/api/:path*` to backend URL to eliminate cross-origin and secret leak issues.

---

## 6. Action Plan for Phase Execution

With this audit established, the remediation steps will proceed strictly according to Phase 1 through Phase 7:
- **Phase 1**: Define canonical `EvaluationRun` data contract and selectors. Unify all mathematical invariants.
- **Phase 2**: Real streaming, honest data labeling (`Live` vs `Sample run`), persistent run history, endpoint coverage, loading/error states.
- **Phase 3**: Unified model configuration (`config/models.ts` & backend) with verified Nebius Token Factory specialized Nemotron 3 model IDs (`nvidia/nemotron-3-nano-30b-a3b`, `nvidia/nemotron-3-ultra-550b-a55b`, `nvidia/nemotron-3-super-120b-a12b`).
- **Phase 4**: Tavily grounding cards, working search inputs, prompt injection defenses.
- **Phase 5**: Verification dimension alignment, exact regression firewall cases, report exports.
- **Phase 6**: Landing page hero stats wiring, why AI agents fail descriptions, footer strips, accessibility cleanup (`.sr-only`), security headers.
- **Phase 7**: Comprehensive invariant unit tests, verification checklist, manual test script.
