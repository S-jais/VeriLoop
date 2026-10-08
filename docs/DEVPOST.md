# VeriLoop — Devpost Submission

## Project Name
**VeriLoop**

## Tagline
**The AI engineer that tests your AI engineer.**  
*Autonomous Reliability Engineering for AI Agents — VeriLoop finds why AI agents fail, experiments with targeted fixes, and proves whether those fixes generalize before deployment.*

---

## 💡 Inspiration
Modern software engineering has spent thirty years developing test automation, CI/CD pipelines, fuzzing, and regression firewalls. Yet today, enterprises are deploying autonomous AI agents into customer-facing environments with little more than static prompt evaluations or a single scalar accuracy score (e.g. *"84% on MMLU"*).

When an agent fails in production—approving a fraudulent refund, leaking confidential system prompts, or hallucinating shipping guarantees—it doesn't fail because it lacked generic world knowledge. It fails because of **policy boundary ambiguity**, **unhandled multi-turn edge cases**, and **regressions introduced by untested prompt tweaks**.

We built **VeriLoop** to bring mature engineering discipline to AI agents: an autonomous reliability loop that doesn't just passively grade agents, but actively discovers their vulnerabilities, diagnoses their causal root causes, synthesizes targeted candidate fixes, and mathematically proves whether those fixes generalize to completely unseen scenarios.

---

## 🔍 What It Does
VeriLoop executes a continuous 6-stage autonomous reliability engineering loop:

1. **Adversarial Test Generation**: Instead of generic questions, VeriLoop generates multi-turn, hardened test suites targeting real operational weaknesses: policy drift (outdated vs modern terms), prompt injections & jailbreaks, and ungrounded tool actions.
2. **Causal Failure Diagnosis**: When a test fails, VeriLoop reconstructs an interactive Directed Acyclic Graph (DAG) that isolates the exact causal chain: from the root vulnerability (e.g., outdated policy document `v1.0`), through the intermediate failure, to the observed bad output.
3. **External Evidence Grounding**: An autonomous agent powered by Tavily AI Research retrieves authentic policy documents and live corporate ground truth to verify whether the agent's behavior was factually compliant.
4. **Intervention Experimentation**: VeriLoop formulates targeted hypotheses and synthesizes candidate agent configurations (system prompt updates, safety guardrail pre-filters, or dynamic model routing).
5. **Split-Isolated Validation**: Using rigorous machine learning discipline, candidate agents are evaluated across strictly isolated splits: **60% Optimization**, **20% Validation**, and **20% Holdout**. Candidate agents can never "see" or train on the holdout split, eliminating data leakage.
6. **Automated Regression Firewall**: A strict gating mechanism blocks any candidate agent that introduces even one new critical failure or fails to exceed holdout performance thresholds.
7. **Verification Certification**: Approved candidates receive an immutable, tamper-evident verification report with an interactive 6-dimension radar comparison and a cryptographic SHA-256 evaluation digest.

---

## 🏛️ Architecture & Deep Technology Integration

VeriLoop is architected around substantive integrations with leading AI infrastructure:

### 1. Nebius Token Factory
- **Role**: High-throughput foundation model inference layer (`https://api.tokenfactory.nebius.com/v1`).
- **Substantive Use**: Powers the core reasoning loop. Because testing, diagnosing, and mutating complex agents requires hundreds of tokens across multi-turn interactions, Nebius Token Factory provides the ultra-low latency, OpenAI-compatible API needed for production-grade reliability loops.
- **Resilience**: Features built-in deterministic fallback mechanisms, ensuring zero crashes or broken UI states during network partitions or offline judging demos.

### 2. NVIDIA Open-Source Models
- **Primary Reasoning Model**: `nvidia/llama-3.1-nemotron-70b-instruct`
  - Utilized for high-complexity cognitive tasks: adversarial test vector generation, causal graph extraction, and regression firewall arbitration.
- **Fast Model**: `meta-llama/Meta-Llama-3.1-8B-Instruct`
  - Utilized for rapid token classification, guardrail validation, and low-latency response scoring.

### 3. Nebius AI Cloud Infrastructure
- **Role**: Sandboxed environment design principles that isolate candidate agent execution from evaluation harnesses, ensuring test safety and preventing data contamination across validation and holdout splits.

### 4. Tavily AI Research
- **Role**: Real-time evidence retrieval agent that fetches external web, documentation, and policy ground truth.
- **Substantive Use**: Rather than hallucinating what an organization's policy should be, VeriLoop invokes Tavily to ground root-cause diagnoses in authentic documentation (e.g., confirming whether ShopEase's refund window is 30 or 90 days).

---

## 💻 Tech Stack
- **Frontend**: Next.js 16 (App Router + Turbopack), React 19, TypeScript, Tailwind CSS, Recharts (6-dimension radar charts), Radix UI, Lucide Icons.
- **Backend**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy (Async), aiosqlite (WAL mode for concurrent evaluation).
- **Inference & Search**: Nebius Token Factory API, NVIDIA Llama 3.1 Nemotron / 8B, Tavily AI Search.
- **DevOps**: Docker, Docker Compose, PowerShell / Bash cross-platform automation.

---

## 🔬 Specific Differentiation (Why VeriLoop is Different)

| Traditional Evaluation Tools | VeriLoop Autonomous Reliability Engineering |
| :--- | :--- |
| **Passive grading**: Output a single scalar percentage (e.g., "78% accuracy"). | **Active engineering loop**: Finds failures, proposes targeted fixes, and tests them. |
| **Static benchmarks**: MMLU, GSM8K, or fixed prompt lists that agents memorize. | **Dynamic adversarial synthesis**: Generates targeted edge cases based on agent domain. |
| **Flat logs**: Hundreds of text lines to read when an agent breaks. | **Causal Failure Graph**: Interactive DAG pinpointing the exact root vulnerability. |
| **No split isolation**: High risk of prompt overfitting and benchmark gaming. | **Rigorous 60/20/20 split isolation**: Zero data leakage into holdout validation. |
| **Silent regressions**: New prompt fixes frequently break previously working behavior. | **Regression Firewall**: Automatically blocks any candidate causing a critical regression. |
| **Unverifiable claims**: "Trust us, the new prompt is better." | **Tamper-evident certificate**: SHA-256 cryptographic digest of test results. |

---

## 🏆 Key Features Built & Demonstrated

1. **Autonomous Reliability Pipeline**: End-to-end 6-stage lifecycle (`TEST → DIAGNOSE → INTERVENE → VALIDATE → FIREWALL → PROVE`).
2. **Interactive Causal Failure Graph**: SVG DAG mapping vulnerabilities to real-world failures.
3. **Behavioral Competence Radar**: 6-dimension Recharts visualization comparing Baseline vs Candidate envelopes across Task Success, Policy Compliance, Grounding, Tool Correctness, Safety, and Context Handling.
4. **Regression Firewall Gate**: Real-time safety gate showing passed vs blocked interventions with rule breakdown.
5. **Interactive Guided Tour**: 6-step in-app walkthrough explaining every stage of the system to judges and users.
6. **Agent Registry & Lineage Tree**: Visual parent-to-child evolution of agent versions with mutation diffs.
7. **Custom Target Agent Registration**: Register any agent via Demo adapter, HTTP Webhook, or OpenAI-compatible endpoint.
8. **Tamper-Evident Verification Certificate**: Cryptographically hashed audit report ready for export or print.

---

## 🔮 What's Next for VeriLoop
- **Automated Fine-Tuning Pipeline**: Translating successful prompt interventions into Nebius-hosted LoRA fine-tuning jobs on NVIDIA GPUs.
- **Continuous CI/CD GitHub Action**: Running the VeriLoop regression firewall on every pull request that modifies an agent prompt or tools.
- **Multi-Agent Swarm Testing**: Extending causal failure graphs to trace cascade failures between multi-agent teams.

---

## 📢 Technology Feedback & Acknowledgments
- **Nebius Token Factory**: Exceptional token throughput and seamless OpenAI API compatibility made running multi-step reasoning evaluations blazing fast.
- **NVIDIA Llama 3.1 Nemotron**: Demonstrated state-of-the-art capability in extracting structured causal relationships and adhering to strict evaluation rubrics without instruction drift.
- **Tavily**: Clean, developer-friendly search API that delivers high-signal, markdown-ready web evidence ideal for LLM context grounding.
