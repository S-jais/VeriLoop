# VeriLoop — 3-Minute Hackathon Demo Script

> **Timing**: Exactly 3 minutes (180 seconds)  
> **Audience**: Hackathon Judges, AI Engineers, Product Leaders  
> **Key Principle**: *A pitch, not a tutorial.*

---

## ⏱️ Minute-by-Minute Presentation Plan

| Timestamp | Phase | Screen / URL | User Action | Talking Point / Pitch |
| :--- | :--- | :--- | :--- | :--- |
| **0:00 – 0:15** | **The Hook: The Failure** | `/` (Dashboard) | Point to the red **Critical Failure Card** on the Dashboard. | *"Every team building AI agents has lived this nightmare: you deploy a customer support agent, and an adversarial prompt tricks it into approving an illegal refund, or an outdated policy leads it to reject your best customers. Static benchmarks tell you your model scored 85%, but they never tell you why it failed, or how to fix it."* |
| **0:15 – 0:30** | **The Solution: VeriLoop** | `/` (Dashboard) | Highlight the **Autonomous Reliability Pipeline ribbon** (TEST → DIAGNOSE → INTERVENE → VALIDATE → FIREWALL → PROVE). | *"This is VeriLoop: the AI engineer that tests your AI engineer. VeriLoop doesn't just grade agents; it autonomously diagnoses why they fail, synthesizes targeted candidate fixes, and mathematically proves whether those fixes generalize before deployment."* |
| **0:30 – 1:00** | **Stage 1: Adversarial Evaluation** | `/evaluations` | Click **"Run Full Evaluation"**. Watch test cards populate with pass/fail metrics. | *"Let's test our live target agent: ShopEase Customer Support Agent v1.0. VeriLoop synthesizes adversarial multi-turn test vectors across 6 behavioral dimensions. Out of 20 edge-case tests, 5 fail—including 2 critical prompt injection vulnerabilities and policy drift errors."* |
| **1:00 – 1:25** | **Stage 2 & 3: Causal Graph & Grounding** | `/failures` | Click **"Failures & Causal"** in sidebar. Hover over the nodes in the SVG Directed Acyclic Graph. | *"Instead of dumping raw terminal logs, VeriLoop constructs a Causal Failure Graph. It traces the observed rejection back to an outdated knowledge base file `policy_v1.0.json`. Then, VeriLoop's Tavily AI Research agent queries real-time corporate policies to ground the true refund window."* |
| **1:25 – 1:50** | **Stage 4: Experiment Lab** | `/experiments` | Click **"Experiment Lab"**. Click **"Run Split Evaluation"** on Candidate v1.1. | *"Next, VeriLoop acts as an engineer: it formulates targeted hypotheses and mutates candidate agents. Here, Candidate v1.1 incorporates an updated policy v2.0 and a safety guardrail. We test this candidate using strict machine learning discipline: a 60% optimization split, a 20% validation split, and a completely isolated 20% holdout split."* |
| **1:50 – 2:10** | **Stage 5: Generalization & Holdout** | `/experiments` | Scroll down to the **Holdout Split Performance** card. Point out the +25% delta. | *"Notice: the holdout split was strictly hidden from the candidate during intervention design. The candidate achieved a 100% pass rate on holdout tests, proving that the fix didn't just overfit to the prompt, but genuinely generalized."* |
| **2:10 – 2:30** | **Infrastructure: Nebius & NVIDIA** | `/settings` | Click **"System & Architecture"** in sidebar. Show the 4 provider cards. | *"This entire autonomous loop is powered by Nebius Token Factory hosting NVIDIA open-source foundation models. We use `nvidia/llama-3.1-nemotron-70b` for deep causal reasoning and adversarial attack generation, and `meta-llama/Meta-Llama-3.1-8B` for fast guardrail scoring, backed by Nebius AI Cloud sandboxing."* |
| **2:30 – 2:50** | **Stage 5: The Regression Firewall** | `/regression` | Click **"Regression Firewall"**. Point to the large green **STATUS: APPROVED** banner and the blocked rule breakdown. | *"Before any agent reaches production, it must clear the VeriLoop Regression Firewall. The firewall enforces zero critical regressions. If a candidate fixes one bug but breaks a previously passing tool call, deployment is automatically BLOCKED. Candidate v1.1 clears all safety gates with zero regressions."* |
| **2:50 – 3:00** | **Stage 6: The Proof** | `/reports` | Click **"Verification Reports"**. Show the comparative radar chart and SHA-256 signature block. | *"Finally, VeriLoop issues an immutable, tamper-evident Verification Certificate with a cryptographic SHA-256 digest and a 6-dimension behavioral radar comparing Baseline to Candidate. Don't just tell me that an AI agent failed. Show me why, test a targeted fix, and prove that it works. That is VeriLoop. Thank you."* |

---

## 💡 Quick Tips for the Presenter
1. **Interactive Tour Backup**: If the judges ask to explore independently, click **"Interactive Tour"** in the left sidebar—it launches the built-in 6-step guided modal that walks through this exact narrative.
2. **Demo Reset**: Need to run the demo again for another judge? Click **"Reset Demo Environment"** in the top navigation bar to reset the database and state in 500ms.
3. **Pacing**: Spend the most time on the **Causal Failure Graph (`/failures`)** and the **Regression Firewall (`/regression`)**—these are the strongest technical differentiators.
