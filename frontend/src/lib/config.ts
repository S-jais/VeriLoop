/**
 * VeriLoop global configuration and sponsor parameters.
 * Single source of truth for model identifiers, inference providers, and environment flags.
 */

import {
  PROBE_MODEL,
  FAST_MODEL,
  INFERENCE_PROVIDER_NAME,
  REASONING_PROVIDER_NAME,
} from '@/config/models';

// NVIDIA Nemotron model ID - single source of truth from config/models.ts
export const NEMOTRON_MODEL_ID = PROBE_MODEL;

// Fast model for high-throughput initial classification
export const FAST_MODEL_ID = FAST_MODEL;

// Sponsor tool naming constants
export const INFERENCE_PROVIDER = INFERENCE_PROVIDER_NAME;
export const REASONING_PROVIDER = REASONING_PROVIDER_NAME;
export const EVIDENCE_PROVIDER = 'Tavily';

// Sponsor strip text for landing and dashboard footers
export const SPONSOR_STRIP =
  'Nebius Token Factory (inference) · NVIDIA Nemotron (reasoning and judging) · Tavily (external evidence)';

// API endpoint and data source resolution
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : 'https://veriloop.onrender.com'
).trim().replace(/\/+$/, '');
export const IS_LIVE = Boolean(API_BASE.length > 0);
export const DATA_SOURCE: 'Sample run' | 'Live' = IS_LIVE ? 'Live' : 'Sample run';

// Canonical agent and experiment metrics
export const CANONICAL_AGENT = {
  id: 'agent-cs-01',
  name: 'Customer Support Agent',
  baselineVersion: 'v1.0 (baseline)',
  candidateVersionA: 'v1.0a (overfit)',
  candidateVersionB: 'v1.1 (remediated)',
  description:
    'Customer Support Agent handling orders, returns, warranties, and multi-turn policy inquiries.',
} as const;

// 100 total probes with 60 / 20 / 20 generalization split
export const CANONICAL_SPLITS = {
  total: 100,
  optimization: { count: 60, pct: 60, label: 'Optimization 60% (60 cases)' },
  validation: { count: 20, pct: 20, label: 'Validation 20% (20 cases)' },
  holdout: { count: 20, pct: 20, label: 'Holdout 20% (20 cases)' },
} as const;

// Canonical experiment matrix
export const CANONICAL_EXPERIMENTS = {
  baseline: {
    name: 'Baseline (v1.0)',
    reliabilityScore: 64,
    passRate: '95/100',
    criticalFailures: 2,
    highFailures: 3,
    regressions: 0,
    optimizationScore: 62,
    optimizationPassed: 37,
    validationScore: 60,
    validationPassed: 12,
    holdoutScore: 58,
    holdoutPassed: 12,
    decision: 'BASELINE',
  },
  candidateA: {
    name: 'Candidate A (Prompt Override)',
    intervention: 'PROMPT · Aggressive policy override prompt wrapper',
    reliabilityScore: 76,
    passRate: '82/100',
    criticalFailures: 1,
    highFailures: 2,
    regressions: 2,
    optimizationScore: 92,
    optimizationPassed: 55,
    validationScore: 71,
    validationPassed: 14,
    holdoutScore: 66,
    holdoutPassed: 13,
    decision: 'REJECTED',
    decisionReason:
      'Rejected: Overfit to optimization set (-26% drop on holdout) and triggered 2 policy regressions.',
  },
  candidateB: {
    name: 'Candidate B (Targeted Remediation)',
    intervention:
      'RETRIEVAL + PROMPT · Recency-ranked vector index + Tavily external grounding + policy guardrail',
    reliabilityScore: 87,
    passRate: '98/100',
    criticalFailures: 0,
    highFailures: 0,
    regressions: 0,
    optimizationScore: 88,
    optimizationPassed: 53,
    validationScore: 86,
    validationPassed: 17,
    holdoutScore: 85,
    holdoutPassed: 17,
    decision: 'VERIFIED',
    decisionReason:
      'Verified: Generalizes cleanly across unseen holdout (85%) with zero regressions detected.',
  },
} as const;
