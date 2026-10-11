/**
 * VeriLoop EvaluationRun Canonical Data Contract
 * Shared single source of truth across frontend and backend.
 */

export type FailureSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaxonomyCategory =
  | 'RETRIEVAL_FAILURE'
  | 'POLICY_FAILURE'
  | 'TOOL_FAILURE'
  | 'SAFETY_FAILURE'
  | 'CONTEXT_FAILURE'
  | 'GROUNDING_FAILURE'
  | 'INSTRUCTION_FAILURE';

export type SplitType = 'optimization' | 'validation' | 'holdout';

export interface ProbeCase {
  id: string;
  scenario: string;
  category: TaxonomyCategory;
  split: SplitType;
  passed: boolean;
  severity: FailureSeverity;
  rootCause?: string;
}

export interface CausalNode {
  id: string;
  label: string;
  type: string;
  detail: string;
}

export interface CausalEdge {
  from: string;
  to: string;
  label: string;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  confidence: number;
  summary: string;
}

export interface FailureItem {
  id: string;
  scenario: string;
  category: TaxonomyCategory;
  severity: FailureSeverity;
  agent: string;
  userInput: string;
  observedBehavior: string;
  rootCause: string;
  mechanism: string;
  evidenceNeeded: boolean;
  recommendedInterventions: string[];
  modelUsed: string;
  inferenceProvider: string;
  trace: [string, string][];
  causalGraph: CausalGraph;
}

export interface SplitResult {
  cases: number;
  passed: number;
  pct: number;
}

export interface CandidateVersion {
  id: string;
  name: string; // 'Candidate A' | 'Candidate B'
  version: string; // 'v1.0a' | 'v1.1'
  interventionType: string;
  description: string;
  isPromoted: boolean; // Promoted candidate label on Candidate B
}

export interface RegressionCase {
  caseId: string;
  scenario: string;
  split: 'Validation' | 'Holdout';
  candidate: string; // 'Candidate A'
  category: 'POLICY' | 'SAFETY' | 'RETRIEVAL';
  severity: FailureSeverity;
  expected: string;
  observed: string;
  impact: string;
}

export interface CandidateVerdict {
  decision: 'VERIFIED' | 'REJECTED' | 'BASELINE';
  reason: string;
}

export interface ModelStepConfig {
  job: string;
  modelId: string;
  provider: string;
  role: string;
}

export interface TavilyEvidenceItem {
  id: string;
  query: string;
  source: string;
  sourceUrl: string;
  summary: string;
  timestamp: string;
  relevance: number;
  status: 'used' | 'filtered';
  linkedFailureId: string;
  reason: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface EvaluationRun {
  id: string;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    description: string;
  };
  baselineVersion: string; // 'Baseline v1.0'
  candidates: CandidateVersion[];
  probes: ProbeCase[];
  failures: FailureItem[];
  splitResults: Record<string, Record<SplitType, SplitResult>>;
  regressions: RegressionCase[];
  verdict: Record<string, CandidateVerdict>;
  modelsUsedPerStep: Record<string, ModelStepConfig>;
  tavilyEvidence: TavilyEvidenceItem[];
  tokenUsage: TokenUsage;
  durationMs: number;
}
