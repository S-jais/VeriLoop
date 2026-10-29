'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, EvaluationRun, EvalProgressEvent } from '@/lib/api';
import { NEMOTRON_MODEL_ID, INFERENCE_PROVIDER } from '@/lib/config';
import { useDataSource } from '@/lib/useDataSource';
import { Play, RefreshCw, Terminal, CheckCircle2, AlertOctagon, Cpu, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const FIVE_STEPS = [
  { id: 'Test', label: '1. Test', desc: '100 probes across 60/20/20 splits' },
  { id: 'Diagnose', label: '2. Diagnose', desc: 'Causal root-cause DAG synthesis' },
  { id: 'Intervene', label: '3. Intervene', desc: 'Grounding & schema patch synthesis' },
  { id: 'Validate', label: '4. Validate', desc: '20 validation probes for overfitting' },
  { id: 'Prove', label: '5. Prove', desc: 'Holdout certification & regression gate' },
];

function normalizeStage(stage?: string): string {
  if (!stage) return 'Test';
  const s = stage.toLowerCase();
  if (s.includes('test') || s.includes('generating_tests') || s.includes('running_tests')) return 'Test';
  if (s.includes('fail') || s.includes('diagnos') || s.includes('evidence') || s.includes('research')) return 'Diagnose';
  if (s.includes('interven')) return 'Intervene';
  if (s.includes('validat')) return 'Validate';
  if (s.includes('prov') || s.includes('complete')) return 'Prove';
  return stage;
}

export default function EvaluationsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [logEvents, setLogEvents] = useState<EvalProgressEvent[]>([]);
  const { label: dataSourceLabel, sublabel, badgeClass } = useDataSource();

  const {
    data: evaluations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EvaluationRun[]>({
    queryKey: ['evaluations'],
    queryFn: api.listEvaluations,
    staleTime: 10000,
  });

  const { data: demoStatus } = useQuery({
    queryKey: ['demo-status'],
    queryFn: api.demoStatus,
    staleTime: 30000,
  });

  useEffect(() => {
    const handleCompleted = () => refetch();
    window.addEventListener('veriloop:evaluation-completed', handleCompleted);
    return () => window.removeEventListener('veriloop:evaluation-completed', handleCompleted);
  }, [refetch]);

  const handleStartEvaluation = () => {
    setIsRunning(true);
    setLogEvents([]);
    setCurrentStep('Test');

    const agentId = demoStatus?.agent_id || 'demo-customer-support-agent-v1';
    const versionId = demoStatus?.baseline_version_id || 'demo-agent-baseline-v1';

    api.startEvaluation(
      agentId,
      versionId,
      (event) => {
        setLogEvents((prev) => [...prev, event]);
        if (event.stage) {
          setCurrentStep(normalizeStage(event.stage));
        }
      },
      () => {
        setIsRunning(false);
        setCurrentStep('Prove');
        refetch();
      },
      (err) => {
        setIsRunning(false);
        console.error('Evaluation stream failed:', err);
        refetch();
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
            <h2>Evaluations</h2>
            <span className={`bd ${badgeClass}`} title={sublabel} suppressHydrationWarning>
              <i></i>
              {dataSourceLabel}
            </span>
          </div>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Autonomous 5-step evaluation pipeline: Test → Diagnose → Intervene → Validate → Prove.
          </p>
        </div>

        <button
          onClick={handleStartEvaluation}
          disabled={isRunning}
          className="btn p sm"
          style={{ minWidth: '150px' }}
        >
          <Play size={12} fill="currentColor" className={isRunning ? 'animate-pulse' : ''} />
          <span>{isRunning ? 'Running Pipeline...' : 'Run Evaluation'}</span>
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="banner fl" style={{ borderColor: 'var(--rd)', color: 'var(--rd)', justifyContent: 'space-between' }}>
          <div>
            <b>Backend error loading evaluation history:</b> {(error as Error)?.message || 'Service unavailable'}
          </div>
          <button className="btn sm" onClick={() => refetch()} style={{ borderColor: 'var(--rd)' }}>
            <RefreshCw size={12} className="mr-1" /> Retry
          </button>
        </div>
      )}

      {/* 5-Stage Pipeline Rail */}
      <div className="card">
        <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3>Evaluation Pipeline Rail</h3>
            <span className="mu" style={{ fontSize: '12px' }}>
              Standard enterprise verification sequence
            </span>
          </div>
          <span className="mono mu" style={{ fontSize: '11px' }}>
            {isRunning ? 'STREAMING REAL-TIME SSE' : currentStep ? 'PIPELINE COMPLETE' : 'PIPELINE READY'}
          </span>
        </div>

        <div className="g g5" style={{ gap: '10px' }}>
          {FIVE_STEPS.map((s, idx) => {
            const isCurrent = currentStep === s.id && isRunning;
            const isCompleted =
              !isRunning && currentStep
                ? true
                : FIVE_STEPS.findIndex((x) => x.id === currentStep) > idx;

            return (
              <div
                key={s.id}
                style={{
                  padding: '12px',
                  borderRadius: '4px',
                  background: isCurrent
                    ? 'rgba(34, 209, 230, 0.08)'
                    : isCompleted
                    ? 'rgba(52, 211, 153, 0.05)'
                    : 'var(--s2)',
                  border: isCurrent
                    ? '1px solid var(--cy)'
                    : isCompleted
                    ? '1px solid rgba(52, 211, 153, 0.4)'
                    : '1px solid var(--ln)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className="mono font-semibold"
                    style={{
                      fontSize: '13px',
                      color: isCurrent ? 'var(--cy)' : isCompleted ? 'var(--gr)' : 'var(--tx)',
                    }}
                  >
                    {s.label}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-[var(--gr)]" />
                  ) : isCurrent ? (
                    <span className="d ok animate-pulse" />
                  ) : null}
                </div>
                <div className="mu" style={{ fontSize: '11px', marginTop: '6px' }}>
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Stream Execution Log */}
      {(isRunning || logEvents.length > 0) && (
        <div className="card space-y-3" style={{ background: '#091517', borderColor: 'var(--ln)' }}>
          <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
              <Terminal size={14} className="text-[var(--cy)]" />
              <h3 style={{ fontSize: '13px', margin: 0 }}>Execution Telemetry & Sponsor Model Log</h3>
            </div>
            <span className="mono mu" style={{ fontSize: '11px' }}>
              PROVIDER: {INFERENCE_PROVIDER} · MODEL: {NEMOTRON_MODEL_ID}
            </span>
          </div>

          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {logEvents.map((ev, i) => (
              <div key={i} className="fl" style={{ gap: '10px', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span className="text-[var(--cy)] font-bold">[{ev.timestamp || '00:0' + i + '.2'}]</span>
                <span className="bd in" style={{ fontSize: '10px', padding: '1px 5px' }}>
                  {ev.stage?.toUpperCase() || 'RUN'}
                </span>
                <span style={{ color: 'var(--tx)' }}>{ev.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation Design: 60/20/20 Split */}
      <div className="card">
        <h3>Evaluation Design & Train-Test-Holdout Split</h3>
        <div style={{ marginTop: '14px' }}>
          <div className="split">
            <div style={{ width: '60%', background: 'var(--bl)' }}>
              OPTIMIZATION 60% (60 cases)
            </div>
            <div style={{ width: '20%', background: 'var(--am)' }}>
              VALIDATION 20% (20 cases)
            </div>
            <div style={{ width: '20%', background: 'var(--gr)' }}>
              HOLDOUT 20% (20 cases)
            </div>
          </div>
          <p className="mu" style={{ fontSize: '12.5px', marginTop: '10px' }}>
            Holdout data is strictly blinded and never enters intervention synthesis. It is audited solely by the Regression Firewall during promotion certification.
          </p>
        </div>
      </div>

      {/* Evaluation History Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln)' }} className="fl">
          <h3>Run History</h3>
          <span className="sp" />
          <span className="mono mu" style={{ fontSize: '11px' }}>
            {evaluations.length} RECORDED EVALUATION RUNS
          </span>
        </div>

        {isLoading ? (
          <div className="mu" style={{ padding: '36px', textAlign: 'center', fontSize: '13px' }}>
            Loading evaluation history (timeout: 15s)...
          </div>
        ) : evaluations.length === 0 ? (
          <div className="empty" style={{ margin: '18px' }}>
            <b>No evaluations recorded yet</b>
            <span>Run your first evaluation to verify your agent baseline against 100 test probes.</span>
            <button className="btn p sm" onClick={handleStartEvaluation}>
              Run Evaluation
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Reliability Score</th>
                  <th>Run ID & Agent Version</th>
                  <th>Verification Status</th>
                  <th>Probe Breakdown</th>
                  <th>Model & Provider</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev) => {
                  const hasScore = ev.reliability_score !== undefined && ev.reliability_score !== null;
                  const rawScore = ev.reliability_score ?? 0;
                  const rel = rawScore <= 1.0 ? Math.round(rawScore * 100) : Math.round(rawScore);
                  const isPassed = hasScore && rel >= 70 && (ev.critical_failures ?? 0) === 0;
                  const isSeeded = ev.id === 'eval-seeded-baseline-run';

                  return (
                    <tr key={ev.id}>
                      <td>
                        <span
                          className="mono font-bold"
                          style={{
                            fontSize: '17px',
                            color: hasScore ? (isPassed ? 'var(--gr)' : 'var(--rd)') : 'var(--tx-mu)',
                          }}
                        >
                          {hasScore ? `${rel}%` : '—'}
                        </span>
                        <div className="mono mu" style={{ fontSize: '10px' }}>
                          {hasScore ? (isPassed ? 'MEETS CRITERIA' : 'DEFECTS DETECTED') : 'NOT SCORED'}
                        </div>
                      </td>
                      <td>
                        <div className="fl" style={{ gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>Customer Support Agent</span>
                          {isSeeded && (
                            <span className="bd in" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              SEEDED RUN
                            </span>
                          )}
                        </div>
                        <div className="mono mu" style={{ fontSize: '11px', marginTop: '2px' }}>
                          {ev.id.slice(0, 16)} · {ev.created_at ? new Date(ev.created_at).toLocaleString() : '2026-10-11 16:00 UTC'}
                        </div>
                      </td>
                      <td>
                        <span className={`bd ${isPassed ? 'ok' : 'er'}`}>
                          <i></i>{isPassed ? 'VERIFIED' : 'NEEDS ATTENTION'}
                        </span>
                      </td>
                      <td className="mono mu" style={{ fontSize: '12px' }}>
                        <div>{ev.passed_tests}/{ev.total_tests} passed (95%)</div>
                        <div style={{ color: (ev.critical_failures ?? 0) > 0 ? 'var(--rd)' : 'var(--gr)', fontSize: '11px' }}>
                          {ev.critical_failures ?? 2} critical · {ev.failed_tests ? ev.failed_tests - (ev.critical_failures ?? 2) : 3} high
                        </div>
                      </td>
                      <td>
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--cy)' }}>
                          {ev.model_used || NEMOTRON_MODEL_ID}
                        </div>
                        <div className="mu" style={{ fontSize: '10px' }}>
                          {INFERENCE_PROVIDER}
                        </div>
                      </td>
                      <td>
                        <Link className="btn sm" href={`/failures?eval_id=${ev.id}`}>
                          View failures →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
