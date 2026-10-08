/**
 * VeriLoop API client — typed requests to the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err.detail || err.error || res.statusText);
  }
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  description: string;
  adapter_type: string;
  is_demo: boolean;
  created_at: string;
  versions?: AgentVersion[];
}

export interface AgentVersion {
  id: string;
  version: string;
  status: string;
  is_baseline: boolean;
  config: Record<string, unknown>;
  notes?: string;
  created_at: string;
}

export interface EvaluationRun {
  id: string;
  agent_id: string;
  agent_version_id: string;
  suite_id: string;
  status: string;
  reliability_score: number | null;
  task_success_score: number | null;
  grounding_score: number | null;
  tool_correctness_score: number | null;
  policy_compliance_score: number | null;
  safety_score: number | null;
  context_handling_score: number | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  critical_failures: number;
  high_failures?: number;
  model_used: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Failure {
  id: string;
  evaluation_id: string;
  test_result_id: string | null;
  category: string;
  failure_type?: string;
  taxonomy_category?: string;
  severity: string;
  expected_behavior: string;
  observed_behavior: string;
  root_cause_hypothesis: string;
  root_cause?: string;
  root_cause_confidence: number | null;
  evidence_needed: boolean;
  recommended_interventions: string[];
  causal_graph: CausalGraph | null;
  status: string;
  created_at: string;
  test_input?: string;
  agent_response?: string;
  tool_calls?: ToolCall[];
  retrieved_context?: string[];
  trace?: Record<string, unknown>;
  scores?: Record<string, number>;
  evidence?: EvidenceItem[];
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  failure_category: string;
  confidence: number;
  summary: string;
}

export interface CausalNode {
  id: string;
  label: string;
  type: 'input' | 'failure' | 'mechanism' | 'root_cause' | 'evidence';
  detail: string;
}

export interface CausalEdge {
  from: string;
  to: string;
  label: string;
}

export interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
  result: string;
  latency_ms: number;
}

export interface EvidenceItem {
  id: string;
  failure_id?: string;
  query: string;
  source_url?: string;
  source_title?: string;
  content_summary?: string;
  retrieved_at?: string;
  reason_for_research?: string;
  source?: string;
  summary?: string;
  reason?: string;
  timestamp?: string;
}

export interface Intervention {
  id: string;
  failure_id?: string | null;
  intervention_type: string;
  description: string;
  change_spec: Record<string, unknown>;
  rationale?: string;
  risk?: string;
  is_catalog?: boolean;
  created_at?: string;
}

export interface Experiment {
  id: string;
  intervention_id: string;
  intervention_description?: string;
  candidate_version_id: string;
  candidate_version?: string;
  baseline_version_id: string;
  baseline_version?: string;
  status: string;
  optimization_baseline: number;
  optimization_candidate: number;
  validation_baseline: number;
  validation_candidate: number;
  holdout_baseline: number;
  holdout_candidate: number;
  critical_failures_before: number;
  critical_failures_after: number;
  regression_count: number;
  regression_details: Regression[];
  decision: string;
  decision_reason: string;
  created_at: string;
  completed_at: string | null;
}

export interface Regression {
  type: string;
  metric: string;
  baseline: number;
  candidate: number;
  description: string;
}

export interface SystemInfo {
  product: string;
  version: string;
  stack: {
    inference: { provider: string; primary_model: string; fast_model: string; configured: boolean };
    evidence: { provider: string; configured: boolean };
  };
  demo_mode: boolean;
}

export interface DemoStatus {
  agent_id: string;
  baseline_version_id: string;
  agent_exists: boolean;
  latest_evaluation: EvaluationRun | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  // Agents
  listAgents: () => request<Agent[]>('/api/agents'),
  getAgent: (id: string) => request<Agent>(`/api/agents/${id}`),

  // Evaluations
  listEvaluations: () => request<EvaluationRun[]>('/api/evaluations'),
  getEvaluation: (id: string) => request<EvaluationRun>(`/api/evaluations/${id}`),

  // Failures
  listFailures: (evalId?: string) =>
    request<Failure[]>(`/api/failures${evalId ? `?eval_id=${evalId}` : ''}`),
  getFailure: (id: string) => request<Failure>(`/api/failures/${id}`),

  // Experiments
  listExperiments: () => request<Experiment[]>('/api/experiments'),
  listInterventions: (failureId?: string) =>
    request<Intervention[]>(`/api/experiments/interventions${failureId ? `?failure_id=${failureId}` : ''}`),
  getExperiment: (id: string) => request<Experiment>(`/api/experiments/${id}`),
  runExperiment: (data: {
    intervention_id: string;
    agent_id: string;
    baseline_version_id: string;
    candidate_config: Record<string, unknown>;
  }) => request<Experiment>('/api/experiments', { method: 'POST', body: JSON.stringify(data) }),
  promoteCandidate: (experimentId: string) =>
    request<{ status: string; new_baseline_version: string }>(`/api/experiments/${experimentId}/promote`, { method: 'POST' }),

  // Evidence
  listEvidence: (failureId?: string) =>
    request<EvidenceItem[]>(`/api/evidence${failureId ? `?failure_id=${failureId}` : ''}`),
  triggerResearch: (data: { query: string; reason: string; failure_id?: string }) =>
    request('/api/evidence/research', { method: 'POST', body: JSON.stringify(data) }),

  // System
  systemInfo: () => request<SystemInfo>('/api/system/info'),
  listModels: () => request('/api/system/models'),
  health: () => request('/api/system/health'),

  // Demo
  demoStatus: () => request<DemoStatus>('/api/demo/status'),
  resetDemo: () => request('/api/demo/reset', { method: 'POST' }),
};

// ─── SSE streaming evaluation ─────────────────────────────────────────────────

export interface EvalProgressEvent {
  stage: string;
  message: string;
  progress?: number;
  eval_id?: string;
  suite_id?: string;
  reliability_score?: number;
  total_tests?: number;
  passed_tests?: number;
  failed_tests?: number;
  critical_failures?: number;
  is_live?: boolean;
  model?: string;
}

export function streamEvaluation(
  agentId: string,
  versionId: string,
  suiteId?: string,
  onEvent?: (event: EvalProgressEvent) => void,
  onError?: (err: Error) => void,
  onComplete?: () => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const body = JSON.stringify({
        agent_id: agentId,
        agent_version_id: versionId,
        suite_id: suiteId || null,
      });

      const res = await fetch(`${API_BASE}/api/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as EvalProgressEvent;
              onEvent?.(event);
            } catch {
              // ignore parse errors
            }
          }
        }
      }
      onComplete?.();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError?.(err as Error);
      }
    }
  })();

  return () => controller.abort();
}
