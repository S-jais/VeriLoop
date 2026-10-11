/**
 * Canonical Model Configuration for Nebius Token Factory and NVIDIA Nemotron.
 * Single source of truth mapping engineering jobs to verified model IDs.
 */

export interface ModelJobMapping {
  job: string;
  model: string;
  inference: string;
  role: string;
  tokenCap?: number;
  temperature?: number;
}

export const NEBIUS_BASE_URL =
  process.env.NEBIUS_BASE_URL ||
  process.env.NEXT_PUBLIC_NEBIUS_BASE_URL ||
  'https://api.tokenfactory.us-central1.nebius.com/v1/';

// Verified Nebius Token Factory model IDs
export const PROBE_MODEL =
  process.env.NEXT_PUBLIC_PROBE_MODEL ||
  process.env.PROBE_MODEL ||
  'nvidia/Nemotron-3_5-Lightning';

export const DIAGNOSIS_MODEL =
  process.env.NEXT_PUBLIC_DIAGNOSIS_MODEL ||
  process.env.DIAGNOSIS_MODEL ||
  'nvidia/Nemotron-3_5-Lightning';

export const JUDGE_MODEL =
  process.env.NEXT_PUBLIC_JUDGE_MODEL ||
  process.env.JUDGE_MODEL ||
  'nvidia/Nemotron-3_5-Lightning';

export const FAST_MODEL =
  process.env.NEXT_PUBLIC_FAST_MODEL ||
  process.env.FAST_MODEL ||
  'nvidia/Nemotron-3_5-Lightning';

export const INFERENCE_PROVIDER_NAME = 'Nebius Token Factory';
export const REASONING_PROVIDER_NAME = 'NVIDIA Nemotron';

export const MODEL_CONFIGS: ModelJobMapping[] = [
  {
    job: 'Adversarial Probe Generation',
    model: PROBE_MODEL,
    inference: INFERENCE_PROVIDER_NAME,
    role: 'Synthesizes multi-turn stress test probes across 60/20/20 generalization splits',
    tokenCap: 4096,
    temperature: 0.2,
  },
  {
    job: 'Causal Failure Diagnosis',
    model: DIAGNOSIS_MODEL,
    inference: INFERENCE_PROVIDER_NAME,
    role: 'Constructs root-cause DAGs and identifies retrieval, policy, and prompt escape vectors',
    tokenCap: 4096,
    temperature: 0.1,
  },
  {
    job: 'Regression Judging & Holdout Certification',
    model: JUDGE_MODEL,
    inference: INFERENCE_PROVIDER_NAME,
    role: 'Evaluates agent responses, audits policy adherence, and gates candidate promotions',
    tokenCap: 4096,
    temperature: 0.0,
  },
  {
    job: 'Fast Semantic Triage',
    model: FAST_MODEL,
    inference: INFERENCE_PROVIDER_NAME,
    role: 'High-throughput semantic filtering, input hygiene, and latency measurement',
    tokenCap: 2048,
    temperature: 0.1,
  },
];
