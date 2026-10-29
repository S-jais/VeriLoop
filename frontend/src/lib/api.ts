/**
 * VeriLoop API client — typed requests with automatic Mock / Live adapter switching.
 * Driven by NEXT_PUBLIC_API_URL: if unset/empty uses lib/mockData, if set calls backend.
 */

import { API_BASE, IS_LIVE, NEMOTRON_MODEL_ID, FAST_MODEL_ID, INFERENCE_PROVIDER } from './config';
import {
  getMockDashboard,
  getMockFailures,
  getMockFailure,
  getMockExperiments,
  getMockEvidence,
  executeMockTavilyQuery,
  getMockReport,
  getMockSettings,
  MOCK_EVAL_STREAM_EVENTS,
  DashboardData,
  MockFailure,
  MockExperimentCandidate,
  MockEvidenceItem,
  MockReportData,
  MockSettingsData,
  CausalGraph,
  CausalNode,
  CausalEdge,
} from './mockData';

let sessionLiveSuccess = false;
const liveListeners = new Set<(isLive: boolean) => void>();

export function isSessionLive(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('veriloop_session_live') === 'true';
  }
  return sessionLiveSuccess;
}

export function markSessionLiveSuccess(): void {
  sessionLiveSuccess = true;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('veriloop_session_live', 'true');
    window.dispatchEvent(
      new CustomEvent('veriloop:data-source-change', { detail: { isLive: true } })
    );
  }
  liveListeners.forEach((cb) => {
    try {
      cb(true);
    } catch {
      // ignore
    }
  });
}

export function subscribeSessionLive(callback: (isLive: boolean) => void): () => void {
  liveListeners.add(callback);
  return () => {
    liveListeners.delete(callback);
  };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const primaryUrl = `${API_BASE}${path}`;
  const timeoutMs = 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(primaryUrl, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: options?.signal || controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const msg = err.detail || err.error || `HTTP ${res.status}: ${res.statusText}`;
      console.warn(`[VeriLoop Backend] ${path} returned ${res.status}:`, msg);
      throw new ApiError(res.status, msg);
    }

    markSessionLiveSuccess();
    return res.json();
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // Direct cross-origin fetch failed or timed out: try same-origin proxy in browser
    if (API_BASE && !primaryUrl.startsWith('/') && typeof window !== 'undefined') {
      try {
        const proxyRes = await fetch(path, {
          headers: { 'Content-Type': 'application/json', ...options?.headers },
          signal: AbortSignal.timeout(15000),
          ...options,
        });
        if (proxyRes.ok) {
          markSessionLiveSuccess();
          return proxyRes.json();
        }
      } catch {
        // Fall through
      }
    }

    const errorObj = err as { name?: string; message?: string };
    if (errorObj?.name === 'AbortError') {
      const timeoutMsg = `Request to ${path} timed out after ${timeoutMs / 1000}s.`;
      console.warn(`[VeriLoop Notice]`, timeoutMsg);
      throw new ApiError(408, timeoutMsg);
    }

    console.warn(`[VeriLoop Notice] ${path}:`, errorObj?.message || err);
    throw err;
  }
}

// ─── Exported Types ──────────────────────────────────────────────────────────

export type {
  DashboardData,
  MockFailure as Failure,
  MockExperimentCandidate as Experiment,
  MockEvidenceItem as EvidenceItem,
  MockReportData as ReportData,
  MockSettingsData as SettingsData,
  CausalGraph,
  CausalNode,
  CausalEdge,
};

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
  provider?: string;
  timestamp?: string;
  step?: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  adapter_type: string;
  connection_type?: string;
  connection_status?: string;
  is_demo: boolean;
  framework?: string;
  endpoint_url?: string;
  current_version?: string;
  last_evaluation_status?: string;
  reliability_score?: number | null;
  critical_failures?: number;
  total_tests?: number;
  created_at: string;
  last_tested_at?: string;
}

export interface ConnectionTestResult {
  status: 'connected' | 'auth_failed' | 'timeout' | 'unreachable' | 'error' | 'success';
  connected?: boolean;
  latency_ms: number;
  status_code?: number;
  sanitized_response?: any;
  response_preview?: string;
  message: string;
}

export interface ZipAnalysisResult {
  detected_framework: string;
  entry_points: string[];
  prompt_files: string[];
  tool_definitions: string[];
  security_issues: string[];
  dependencies: string[];
  file_count: number;
  total_size_kb: number;
  supported_capabilities: {
    static_analysis: boolean;
    config_inspection: boolean;
    runtime_execution: boolean;
    api_behavioral_evaluation: boolean;
    source_level_fixes: boolean;
  };
  execution_disclaimer: string;
}

export interface FailureReplayResult {
  replay_id: string;
  failure_id: string;
  target_version: string;
  passed: boolean;
  original_output: string;
  replayed_output: string;
  score_delta: number;
  latency_ms: number;
  tool_calls: any[];
  notes?: string;
  saved_as_regression_test: boolean;
}

export interface FailureClusterItem {
  id: string;
  name: string;
  category: string;
  severity: string;
  description: string;
  failure_count: number;
  recurrence_rate: number;
  affected_agents: string[];
  common_evidence: string;
  recommended_remediation: string;
  remediation_validated: boolean;
}

export interface DriftMonitorItem {
  id: string;
  agent_id: string;
  cadence: string;
  status: string;
  total_checks_run: number;
  drift_detected_count: number;
  alert_threshold_pass_rate: number;
  alert_email?: string;
  last_pass_rate?: number;
  last_run_at?: string;
  created_at: string;
}

export interface EvaluationRun {
  id: string;
  agent_id: string;
  agent_version_id: string;
  suite_id?: string;
  status: string;
  reliability_score: number | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  critical_failures: number;
  high_failures?: number;
  model_used: string | null;
  created_at: string;
}

export interface DemoStatus {
  agent_id: string;
  baseline_version_id: string;
  agent_exists: boolean;
  latest_evaluation: {
    id: string;
    agent_id: string;
    agent_version_id: string;
    status: string;
    reliability_score: number;
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    critical_failures: number;
    high_failures: number;
    model_used: string;
    created_at: string;
  } | null;
}

// ─── Core Required Functions (Section 1 Contract) ───────────────────────────

/**
 * 1. getDashboard: Retrieves overall reliability score, metrics, 60/20/20 splits,
 * hotspots, recent failures, and candidate experiments.
 */
export async function getDashboard(): Promise<DashboardData> {
  if (!IS_LIVE) {
    return getMockDashboard();
  }
  try {
    return await request<DashboardData>('/api/dashboard');
  } catch (err) {
    console.warn('Live getDashboard failed, falling back to mock adapter:', err);
    return getMockDashboard();
  }
}

/**
 * 2. startEvaluation: Starts multi-stage audit run, streaming timed events with 5-stage progress rail.
 */
function runMockEvaluationStream(
  onEvent?: (event: EvalProgressEvent) => void,
  onComplete?: () => void
): () => void {
  const timeouts: NodeJS.Timeout[] = [];

  MOCK_EVAL_STREAM_EVENTS.forEach((ev, idx) => {
    const delay = (idx + 1) * 650;
    const t = setTimeout(() => {
      onEvent?.({
        stage: ev.stage,
        message: ev.message,
        progress: ev.progress,
        step: ev.step,
        model: ev.model,
        provider: ev.provider,
        timestamp: ev.timestamp,
        is_live: false,
        reliability_score: ev.stage === 'completed' ? 87 : 78,
        total_tests: 100,
        passed_tests: ev.stage === 'completed' ? 98 : 95,
        failed_tests: ev.stage === 'completed' ? 2 : 5,
        critical_failures: ev.stage === 'completed' ? 0 : 2,
      });

      if (idx === MOCK_EVAL_STREAM_EVENTS.length - 1) {
        onComplete?.();
      }
    }, delay);
    timeouts.push(t);
  });

  return () => {
    timeouts.forEach((t) => clearTimeout(t));
  };
}

export function startEvaluation(
  agentId?: string,
  versionId?: string,
  onEvent?: (event: EvalProgressEvent) => void,
  onComplete?: () => void,
  onError?: (err: Error) => void
): () => void {
  if (!IS_LIVE) {
    return runMockEvaluationStream(onEvent, onComplete);
  }

  // Live SSE stream with automatic fallback
  const controller = new AbortController();
  let fallbackCleanup: (() => void) | null = null;

  (async () => {
    const targetAgentId =
      !agentId || agentId === 'agent-cs-01' || agentId === 'demo-customer-support-agent-v1'
        ? undefined
        : agentId;
    const targetVersionId =
      !versionId || versionId === 'v1.0' || versionId.includes('baseline') || versionId === 'demo-agent-baseline-v1'
        ? undefined
        : versionId;

    try {
      let res: Response | null = await fetch(`${API_BASE}/api/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: targetAgentId,
          agent_version_id: targetVersionId,
        }),
        signal: controller.signal,
      }).catch(() => null);

      if ((!res || !res.ok) && API_BASE && !API_BASE.startsWith('/') && typeof window !== 'undefined') {
        res = await fetch('/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: targetAgentId,
            agent_version_id: targetVersionId,
          }),
          signal: controller.signal,
        }).catch(() => null);
      }

      if (!res || !res.ok || !res.body) {
        console.warn('Live evaluation endpoint unavailable. Falling back to evaluation stream.');
        fallbackCleanup = runMockEvaluationStream(onEvent, onComplete);
        return;
      }

      markSessionLiveSuccess();
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
              // Ignore malformed chunks
            }
          }
        }
      }
      onComplete?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('veriloop:evaluation-completed'));
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Live evaluation stream disconnected or unavailable. Falling back to simulated stream:', err);
        fallbackCleanup = runMockEvaluationStream(onEvent, onComplete);
      }
    }
  })();

  return () => {
    controller.abort();
    if (fallbackCleanup) fallbackCleanup();
  };
}

/**
 * 3. listFailures: Lists failures, optionally filtered by evalId.
 */
export async function listFailures(evalId?: string): Promise<MockFailure[]> {
  if (!IS_LIVE) {
    return getMockFailures(evalId);
  }
  try {
    return await request<MockFailure[]>(`/api/failures${evalId ? `?eval_id=${evalId}` : ''}`);
  } catch (err) {
    console.warn('Live listFailures failed, falling back to mock adapter:', err);
    return getMockFailures(evalId);
  }
}

/**
 * 4. getFailure: Fetches failure detail including causal DAG and trace.
 */
export async function getFailure(id: string): Promise<MockFailure> {
  if (!IS_LIVE) {
    const f = getMockFailure(id);
    if (!f) throw new ApiError(404, `Failure ${id} not found`);
    return f;
  }
  try {
    return await request<MockFailure>(`/api/failures/${id}`);
  } catch (err) {
    console.warn('Live getFailure failed, falling back to mock adapter:', err);
    return getMockFailure(id) || getMockFailures()[0];
  }
}

/**
 * 5. listExperiments: Lists candidate interventions, 60/20/20 split scores, verdicts, and regression tests.
 */
export async function listExperiments(): Promise<MockExperimentCandidate[]> {
  if (!IS_LIVE) {
    return getMockExperiments();
  }
  try {
    return await request<MockExperimentCandidate[]>('/api/experiments');
  } catch (err) {
    console.warn('Live listExperiments failed, falling back to mock adapter:', err);
    return getMockExperiments();
  }
}

/**
 * 6. runTavilyQuery: Executes external grounding research query.
 */
export async function runTavilyQuery(
  query: string,
  reason?: string,
  failureId?: string
): Promise<MockEvidenceItem> {
  if (!IS_LIVE) {
    return executeMockTavilyQuery(query, reason, failureId);
  }
  try {
    return await request<MockEvidenceItem>('/api/evidence/research', {
      method: 'POST',
      body: JSON.stringify({ query, reason: reason || 'Policy verification', failure_id: failureId }),
    });
  } catch (err) {
    console.warn('Live runTavilyQuery failed, falling back to mock adapter:', err);
    return executeMockTavilyQuery(query, reason, failureId);
  }
}

/**
 * 7. getReport: Returns verification certificate, sample counts, run records, and regressions.
 */
export async function getReport(): Promise<MockReportData> {
  if (!IS_LIVE) {
    return getMockReport();
  }
  try {
    return await request<MockReportData>('/api/reports/latest');
  } catch (err) {
    console.warn('Live getReport failed, falling back to mock adapter:', err);
    return getMockReport();
  }
}

/**
 * 8. getSettings: Returns models map, inference provider, splits, and API key policy note.
 */
export async function getSettings(): Promise<MockSettingsData> {
  if (!IS_LIVE) {
    return getMockSettings();
  }
  try {
    return await request<MockSettingsData>('/api/settings');
  } catch (err) {
    console.warn('Live getSettings failed, falling back to mock adapter:', err);
    return getMockSettings();
  }
}

export interface HealthStatus {
  status: string;
  nebius_configured: boolean;
  tavily_configured: boolean;
  inference_provider: string;
  primary_model: string;
  fast_model: string;
}

export async function getHealth(): Promise<HealthStatus> {
  if (!IS_LIVE) {
    return {
      status: 'healthy',
      nebius_configured: true,
      tavily_configured: true,
      inference_provider: INFERENCE_PROVIDER,
      primary_model: NEMOTRON_MODEL_ID,
      fast_model: FAST_MODEL_ID,
    };
  }
  try {
    return await request<HealthStatus>('/health');
  } catch {
    try {
      const sysHealth = await request<{ status: string; nebius_configured?: boolean; tavily_configured?: boolean }>('/api/system/health');
      return {
        status: sysHealth.status || 'healthy',
        nebius_configured: sysHealth.nebius_configured ?? true,
        tavily_configured: sysHealth.tavily_configured ?? true,
        inference_provider: INFERENCE_PROVIDER,
        primary_model: NEMOTRON_MODEL_ID,
        fast_model: FAST_MODEL_ID,
      };
    } catch (err) {
      console.warn('Live getHealth failed, returning default status:', err);
      return {
        status: 'demo',
        nebius_configured: true,
        tavily_configured: true,
        inference_provider: INFERENCE_PROVIDER,
        primary_model: NEMOTRON_MODEL_ID,
        fast_model: FAST_MODEL_ID,
      };
    }
  }
}

// ─── Universal `api` Object & Backward Compatibility ────────────────────────

export const api = {
  // Required Section 1 API functions
  getDashboard,
  startEvaluation,
  listFailures,
  getFailure,
  listExperiments,
  runTavilyQuery,
  getReport,
  getSettings,
  getHealth,

  // Additional helper methods & compatibility wrappers
  listEvidence: async () => {
    if (!IS_LIVE) return getMockEvidence();
    try {
      return await request<MockEvidenceItem[]>('/api/evidence');
    } catch {
      return getMockEvidence();
    }
  },
  triggerResearch: async (data: { query: string; reason: string; failure_id?: string }) => {
    return runTavilyQuery(data.query, data.reason, data.failure_id);
  },
  runExperiment: async (data: {
    intervention_id: string;
    agent_id: string;
    baseline_version_id: string;
    candidate_config: Record<string, unknown>;
  }) => {
    if (!IS_LIVE) return getMockExperiments()[0];
    try {
      return await request<MockExperimentCandidate>('/api/experiments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      return getMockExperiments()[0];
    }
  },
  listAgents: async (): Promise<Agent[]> => {
    if (!IS_LIVE) {
      return [
        {
          id: 'agent-cs-01',
          name: 'Demo Customer Support Agent',
          description: 'Autonomous customer support agent handling returns, warranties, and multi-turn policy inquiries.',
          adapter_type: 'demo_customer_support',
          connection_type: 'demo',
          connection_status: 'connected',
          framework: 'LangGraph',
          is_demo: true,
          current_version: 'Baseline v1.0',
          created_at: new Date().toISOString(),
        },
      ];
    }
    try {
      const data = await request<Agent[]>('/api/agents');
      if (Array.isArray(data) && data.length > 0) return data;
      return [
        {
          id: 'demo-customer-support-agent-v1',
          name: 'Demo Customer Support Agent',
          description: 'A demonstration customer support agent for ShopEase e-commerce.',
          adapter_type: 'demo_customer_support',
          connection_type: 'demo',
          connection_status: 'connected',
          framework: 'LangGraph',
          is_demo: true,
          current_version: 'Baseline v1.0',
          created_at: new Date().toISOString(),
        },
      ];
    } catch (err) {
      console.warn('Live listAgents failed, using canonical agent:', err);
      return [
        {
          id: 'demo-customer-support-agent-v1',
          name: 'Demo Customer Support Agent',
          description: 'A demonstration customer support agent for ShopEase e-commerce.',
          adapter_type: 'demo_customer_support',
          connection_type: 'demo',
          connection_status: 'connected',
          framework: 'LangGraph',
          is_demo: true,
          current_version: 'Baseline v1.0',
          created_at: new Date().toISOString(),
        },
      ];
    }
  },

  getAgent: async (id: string): Promise<Agent | null> => {
    if (!IS_LIVE) return (await api.listAgents())[0];
    try {
      return await request<Agent>(`/api/agents/${id}`);
    } catch {
      return (await api.listAgents())[0];
    }
  },

  createAgent: async (payload: any): Promise<any> => {
    if (!IS_LIVE) {
      return { id: `agent-${Date.now()}`, name: payload.name, connection_status: 'connected' };
    }
    return request<any>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  testAgentConnection: async (payload: any): Promise<ConnectionTestResult> => {
    if (!IS_LIVE) {
      return {
        status: 'connected',
        latency_ms: 124,
        status_code: 200,
        sanitized_response: { message: 'Echo connection verified' },
        message: 'Endpoint reachable and authenticated (demo simulated).',
      };
    }
    return request<ConnectionTestResult>('/api/agents/test-connection', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadAgentZip: async (file: File): Promise<ZipAnalysisResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const primaryUrl = `${API_BASE}/api/agents/upload-zip`;
    const res = await fetch(primaryUrl, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, err.detail || err.error || 'Failed to inspect ZIP archive');
    }
    return res.json();
  },

  importAgentConfig: async (payload: any): Promise<any> => {
    if (!IS_LIVE) return { status: 'parsed', config: payload };
    return request<any>('/api/agents/import-config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listEvaluations: async (): Promise<EvaluationRun[]> => {
    if (!IS_LIVE) {
      return [
        {
          id: 'eval-run-01',
          agent_id: 'agent-cs-01',
          agent_version_id: 'v1.0',
          suite_id: 'suite-baseline-100',
          status: 'COMPLETED',
          reliability_score: 0.78,
          total_tests: 100,
          passed_tests: 95,
          failed_tests: 5,
          critical_failures: 2,
          high_failures: 3,
          model_used: NEMOTRON_MODEL_ID,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    }
    try {
      const runs = await request<EvaluationRun[]>('/api/evaluations');
      if (Array.isArray(runs) && runs.length > 0) return runs;
      // If DB has no evaluations yet, return canonical run so users can inspect baseline
      return [
        {
          id: 'eval-seeded-baseline-run',
          agent_id: 'demo-customer-support-agent-v1',
          agent_version_id: 'demo-agent-baseline-v1',
          suite_id: 'suite-baseline-100',
          status: 'COMPLETED',
          reliability_score: 0.78,
          total_tests: 100,
          passed_tests: 95,
          failed_tests: 5,
          critical_failures: 2,
          high_failures: 3,
          model_used: NEMOTRON_MODEL_ID,
          created_at: new Date().toISOString(),
        },
      ];
    } catch (err) {
      console.warn('Live listEvaluations failed, falling back to canonical run:', err);
      return [
        {
          id: 'eval-seeded-baseline-run',
          agent_id: 'demo-customer-support-agent-v1',
          agent_version_id: 'demo-agent-baseline-v1',
          suite_id: 'suite-baseline-100',
          status: 'COMPLETED',
          reliability_score: 0.78,
          total_tests: 100,
          passed_tests: 95,
          failed_tests: 5,
          critical_failures: 2,
          high_failures: 3,
          model_used: NEMOTRON_MODEL_ID,
          created_at: new Date().toISOString(),
        },
      ];
    }
  },

  replayFailure: async (failureId: string, payload: any): Promise<FailureReplayResult> => {
    if (!IS_LIVE) {
      return {
        replay_id: `replay-${Date.now()}`,
        failure_id: failureId,
        target_version: payload.target_version_name || 'Replayed candidate',
        passed: true,
        original_output: 'Denied transit warranty claim incorrectly.',
        replayed_output: 'Approved 90-day transit damage replacement under policy v3.4.',
        score_delta: 0.80,
        latency_ms: 340,
        tool_calls: [{ name: 'warranty_lookup', result: 'COVERED' }],
        notes: 'Verification passed with targeted grounding',
        saved_as_regression_test: payload.save_as_regression_test || false,
      };
    }
    return request<FailureReplayResult>(`/api/failures/${failureId}/replay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getFailureGenome: async (): Promise<FailureClusterItem[]> => {
    if (!IS_LIVE) {
      return [
        {
          id: 'cluster-ret-stale',
          name: 'Stale Vector Index Retrieval Cluster',
          category: 'RETRIEVAL_FAILURE',
          severity: 'HIGH',
          description: 'Vector retrieval pulls deprecated policy chunk instead of active 2026 guidelines.',
          failure_count: 4,
          recurrence_rate: 0.28,
          affected_agents: ['ShopEase Customer Support Agent'],
          common_evidence: 'ShopEase Master Return & Refund Policy 2026',
          recommended_remediation: 'RETRIEVAL + PROMPT: Hybrid recency re-ranking + Tavily grounding',
          remediation_validated: true,
        },
        {
          id: 'cluster-pol-fraud',
          name: 'Unbounded Fraud Payout Policy Breach',
          category: 'POLICY_FAILURE',
          severity: 'CRITICAL',
          description: 'High-value claims ($200+) approved automatically without photo evidence or manager approval.',
          failure_count: 3,
          recurrence_rate: 0.21,
          affected_agents: ['ShopEase Customer Support Agent'],
          common_evidence: 'E-Commerce High-Value Damage Threshold Standard',
          recommended_remediation: 'GUARDRAIL + WORKFLOW: Hard supervisor gating on payouts > $200',
          remediation_validated: true,
        },
      ];
    }
    try {
      return await request<FailureClusterItem[]>('/api/failures/genome');
    } catch {
      return [];
    }
  },

  listDriftMonitors: async (): Promise<DriftMonitorItem[]> => {
    if (!IS_LIVE) {
      return [
        {
          id: 'monitor-01',
          agent_id: 'demo-customer-support-agent-v1',
          cadence: 'daily',
          status: 'active',
          total_checks_run: 14,
          drift_detected_count: 1,
          alert_threshold_pass_rate: 0.90,
          alert_email: 'reliability@veriloop.ai',
          last_pass_rate: 0.95,
          last_run_at: new Date().toISOString(),
          created_at: new Date(Date.now() - 864000000).toISOString(),
        },
      ];
    }
    try {
      return await request<DriftMonitorItem[]>('/api/monitoring');
    } catch {
      return [];
    }
  },

  createDriftMonitor: async (payload: any): Promise<any> => {
    return request<any>('/api/monitoring', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  runDriftCheck: async (monitorId: string): Promise<any> => {
    return request<any>(`/api/monitoring/${monitorId}/run`, {
      method: 'POST',
    });
  },

  demoStatus: async (): Promise<DemoStatus> => {
    if (!IS_LIVE) {
      return {
        agent_id: 'demo-customer-support-agent-v1',
        baseline_version_id: 'demo-agent-baseline-v1',
        agent_exists: true,
        latest_evaluation: {
          id: 'eval-run-01',
          agent_id: 'agent-cs-01',
          agent_version_id: 'v1.0',
          status: 'COMPLETED',
          reliability_score: 0.78,
          total_tests: 100,
          passed_tests: 95,
          failed_tests: 5,
          critical_failures: 2,
          high_failures: 3,
          model_used: NEMOTRON_MODEL_ID,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      };
    }
    try {
      return await request<DemoStatus>('/api/demo/status');
    } catch {
      return {
        agent_id: 'demo-customer-support-agent-v1',
        baseline_version_id: 'demo-agent-baseline-v1',
        agent_exists: true,
        latest_evaluation: {
          id: 'eval-seeded-baseline-run',
          agent_id: 'demo-customer-support-agent-v1',
          agent_version_id: 'demo-agent-baseline-v1',
          status: 'COMPLETED',
          reliability_score: 0.78,
          total_tests: 100,
          passed_tests: 95,
          failed_tests: 5,
          critical_failures: 2,
          high_failures: 3,
          model_used: NEMOTRON_MODEL_ID,
          created_at: new Date().toISOString(),
        },
      };
    }
  },

  resetDemo: async () => {
    if (!IS_LIVE) return { status: 'ok', message: 'Demo reset locally' };
    return request('/api/demo/reset', { method: 'POST' });
  },
};

// Also export streamEvaluation as alias for startEvaluation
export const streamEvaluation = (
  agentId: string,
  versionId: string,
  suiteId?: string,
  onEvent?: (event: EvalProgressEvent) => void,
  arg5?: (() => void) | ((err: Error) => void),
  arg6?: (() => void) | ((err: Error) => void)
) => {
  let onComplete: (() => void) | undefined;
  let onError: ((err: Error) => void) | undefined;

  if (typeof arg5 === 'function') {
    onComplete = arg5 as () => void;
  }
  if (typeof arg6 === 'function') {
    onError = arg6 as (err: Error) => void;
  }

  return startEvaluation(agentId, versionId, onEvent, onComplete, onError);
};
