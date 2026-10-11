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
  const timeoutMs = 6000;
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
          signal: AbortSignal.timeout(4000),
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
  is_demo: boolean;
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
        reliability_score: ev.stage === 'completed' ? 87 : 64,
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
    // Map canonical agent and version identifiers to backend database records
    const targetAgentId =
      !agentId || agentId === 'agent-cs-01' || agentId === 'demo-customer-support-agent-v1'
        ? 'demo-customer-support-agent-v1'
        : agentId;
    const targetVersionId =
      !versionId || versionId === 'v1.0' || versionId.includes('baseline') || versionId === 'demo-agent-baseline-v1'
        ? 'demo-agent-baseline-v1'
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
    return [
      {
        id: 'agent-cs-01',
        name: 'Customer Support Agent',
        description: 'Customer Support Agent handling orders, returns, warranties, and multi-turn policy inquiries.',
        adapter_type: 'demo_customer_support',
        is_demo: true,
        created_at: new Date().toISOString(),
      },
    ];
  },
  getAgent: async (id: string) => {
    return (await api.listAgents())[0];
  },
  listEvaluations: async () => {
    const dash = await getDashboard();
    return [
      {
        id: 'eval-run-01',
        agent_id: 'agent-cs-01',
        agent_version_id: 'v1.0',
        suite_id: 'suite-baseline-100',
        status: 'COMPLETED',
        reliability_score: 0.64,
        total_tests: 100,
        passed_tests: 95,
        failed_tests: 5,
        critical_failures: 2,
        high_failures: 3,
        model_used: NEMOTRON_MODEL_ID,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  },
  demoStatus: async (): Promise<DemoStatus> => {
    return {
      agent_id: 'agent-cs-01',
      baseline_version_id: 'v1.0',
      agent_exists: true,
      latest_evaluation: {
        id: 'eval-run-01',
        agent_id: 'agent-cs-01',
        agent_version_id: 'v1.0',
        status: 'COMPLETED',
        reliability_score: 0.64,
        total_tests: 100,
        passed_tests: 95,
        failed_tests: 5,
        critical_failures: 2,
        high_failures: 3,
        model_used: NEMOTRON_MODEL_ID,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    };
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
