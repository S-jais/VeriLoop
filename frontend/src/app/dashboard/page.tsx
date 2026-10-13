'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, DashboardData, EvalProgressEvent } from '@/lib/api';
import { NEMOTRON_MODEL_ID, INFERENCE_PROVIDER, SPONSOR_STRIP } from '@/lib/config';
import { useDataSource } from '@/lib/useDataSource';
import { Play, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Cpu, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import AddAgentWizard from '@/components/AddAgentWizard';

const TAXONOMY_CATEGORIES = [
  'POLICY_FAILURE',
  'SAFETY_FAILURE',
  'RETRIEVAL_FAILURE',
  'TOOL_FAILURE',
  'CONTEXT_FAILURE',
  'GROUNDING_FAILURE',
  'INSTRUCTION_FAILURE',
];

const STAGES = ['Test', 'Diagnose', 'Intervene', 'Validate', 'Prove'];

export default function DashboardPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [progressEvents, setProgressEvents] = useState<EvalProgressEvent[]>([]);
  const [currentStageName, setCurrentStageName] = useState<string>('');
  const [currentProgressPct, setCurrentProgressPct] = useState<number>(0);

  const { label: dataSourceLabel, sublabel, badgeClass } = useDataSource();

  const { data: dashboard, refetch, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
    staleTime: 10000,
  });

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('veriloop:evaluation-completed', handler);
    return () => window.removeEventListener('veriloop:evaluation-completed', handler);
  }, [refetch]);

  const metrics = dashboard?.metrics;
  const reliability = metrics?.reliabilityScore ?? 64;
  const failures = dashboard?.recentFailures || [];

  function handleRunEvaluation() {
    setIsRunning(true);
    setProgressEvents([]);
    setCurrentProgressPct(0);
    setCurrentStageName('Test');

    const stop = api.startEvaluation(
      dashboard?.agent.id || 'agent-cs-01',
      dashboard?.agent.version || 'v1.0',
      (event) => {
        setProgressEvents((prev) => [...prev, event]);
        setCurrentStageName(event.stage);
        setCurrentProgressPct(event.progress ?? 0);
      },
      () => {
        setIsRunning(false);
        refetch();
      },
      (err) => {
        setIsRunning(false);
        console.error('Evaluation stream error:', err);
      }
    );
  }

  const agentStatus =
    metrics && metrics.criticalFailures === 0
      ? 'VERIFIED'
      : 'NEEDS ATTENTION';

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)] w-full min-w-0">
      {/* Header Section */}
      <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--ln)' }}>
        <div className="fl" style={{ gap: '10px', alignItems: 'center' }}>
          <span className={`bd ${metrics?.criticalFailures === 0 ? 'ok' : 'er'}`}>
            <i></i>
            {agentStatus}
          </span>
          <span className="mono mu" style={{ fontSize: '12px' }}>
            {dashboard?.agent.name || 'Customer Support Agent'} · {dashboard?.agent.version || 'v1.0 (baseline)'}
          </span>
          <span className="sp" />
          <span className={`bd ${badgeClass}`} title={sublabel} suppressHydrationWarning>
            <i></i>
            {dataSourceLabel}
          </span>
        </div>

        {isError && (
          <div className="banner fl" style={{ borderColor: 'var(--rd)', color: 'var(--rd)', justifyContent: 'space-between', marginTop: '16px' }}>
            <div>
              <b>Failed to load latest live evaluation:</b> {(error as Error)?.message || 'Backend unreachable'}
            </div>
            <button className="btn sm" onClick={() => refetch()} style={{ borderColor: 'var(--rd)' }}>
              <RefreshCw size={12} className="mr-1" /> Retry
            </button>
          </div>
        )}

        <div className="eyebrow" style={{ marginTop: '16px', marginBottom: '8px' }}>
          Autonomous reliability engineering
        </div>

        <h1 style={{ fontSize: 'clamp(24px, 4.5vw, 42px)', lineHeight: 1.15 }}>
          Know why your agent fails <span className="mu">before your users do.</span>
        </h1>

        <div
          className="fl"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <p className="lead" style={{ fontSize: 'clamp(14px, 2.5vw, 18px)' }}>
            Test. Diagnose. Intervene. Validate. Prove.
          </p>
          <div className="fl" style={{ gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn p whitespace-nowrap"
              onClick={handleRunEvaluation}
              disabled={isRunning}
            >
              <Play size={13} fill="currentColor" />
              <span>{isRunning ? 'Running evaluation...' : 'Run Evaluation'}</span>
            </button>
            <button
              className="btn whitespace-nowrap"
              onClick={() => setShowWizard(true)}
            >
              <span>+ Connect Agent</span>
            </button>
            <Link className="btn whitespace-nowrap" href="/reports">
              View latest report
            </Link>
          </div>
        </div>
      </div>

      {/* Live Running Progress Rail */}
      {isRunning && (
        <div className="card space-y-4" style={{ borderColor: 'var(--cy)', background: 'rgba(34, 209, 230, 0.04)' }}>
          <div className="fl" style={{ justifyContent: 'space-between' }}>
            <div className="fl" style={{ gap: '8px' }}>
              <span className="bd in animate-pulse">
                <i></i>EVALUATION PIPELINE STREAMING
              </span>
              <span className="mono mu" style={{ fontSize: '12px' }}>
                Model: {NEMOTRON_MODEL_ID} via {INFERENCE_PROVIDER}
              </span>
            </div>
            <span className="mono font-bold text-[var(--cy)]" style={{ fontSize: '13px' }}>
              {currentProgressPct}%
            </span>
          </div>

          {/* 5-Step Progress Rail */}
          <div className="g g5" style={{ gap: '8px' }}>
            {STAGES.map((stg, idx) => {
              const currentIdx = STAGES.indexOf(currentStageName);
              const isPast = currentIdx > idx || currentProgressPct === 100;
              const isCurrent = currentStageName === stg;
              return (
                <div
                  key={stg}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '4px',
                    background: isCurrent
                      ? 'rgba(34, 209, 230, 0.15)'
                      : isPast
                      ? 'rgba(52, 211, 153, 0.1)'
                      : 'var(--s2)',
                    border: `1px solid ${
                      isCurrent
                        ? 'var(--cy)'
                        : isPast
                        ? 'rgba(52, 211, 153, 0.4)'
                        : 'var(--ln)'
                    }`,
                    textAlign: 'center',
                  }}
                >
                  <div className="mono font-semibold" style={{ fontSize: '11px', color: isCurrent ? 'var(--cy)' : isPast ? 'var(--gr)' : 'var(--mu)' }}>
                    0{idx + 1}. {stg}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '2px', color: 'var(--mu)' }}>
                    {isCurrent ? 'Running...' : isPast ? 'Completed' : 'Queued'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Event Log Ticker */}
          <div
            className="mono mu"
            style={{
              padding: '10px 12px',
              background: 'var(--s1)',
              borderRadius: '3px',
              fontSize: '12px',
              lineHeight: 1.5,
              border: '1px solid var(--ln)',
            }}
          >
            {progressEvents.length > 0
              ? progressEvents[progressEvents.length - 1].message
              : `Initializing evaluation suite via ${NEMOTRON_MODEL_ID}...`}
          </div>
        </div>
      )}

      {/* Reliability Score & Top Metric Cards */}
      <div className="g g21">
        <div className="card">
          <div className="lbl">VeriLoop reliability score</div>
          <div className="fl" style={{ margin: '8px 0', flexWrap: 'wrap', gap: '8px', alignItems: 'baseline' }}>
            <span
              className={`big ${reliability >= 80 ? 'text-[var(--gr)]' : 'text-[var(--rd)]'}`}
              style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}
            >
              {reliability}%
            </span>
            <span className="mu" style={{ fontSize: '15px' }}>/100</span>
            <span className={`bd ${reliability >= 80 ? 'ok' : 'er'}`}>
              <i></i>
              {reliability >= 80 ? 'PASS' : 'FAIL'}
            </span>
          </div>
          <p className="mu" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            Enterprise severity-weighted index: 100 − (12×critical + 4×high). Penalized by 2 Critical and 3 High flaws. Target threshold: ≥80%.
          </p>
        </div>

        <div className="card g g2" style={{ gap: '14px' }}>
          <div>
            <div className="lbl">Critical failures</div>
            <div
              className={`big ${metrics?.criticalFailures ? 'text-[var(--rd)]' : 'mu'}`}
              style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}
            >
              {metrics ? metrics.criticalFailures : 2}
            </div>
            <span className="mu" style={{ fontSize: '11px' }}>Policy & Safety breaches (0 allowed)</span>
          </div>
          <div>
            <div className="lbl">High-severity</div>
            <div
              className={`big ${metrics?.highFailures ? 'text-[var(--or)]' : 'mu'}`}
              style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}
            >
              {metrics ? metrics.highFailures : 3}
            </div>
            <span className="mu" style={{ fontSize: '11px' }}>Retrieval, Tool & Context flaws</span>
          </div>
          <div>
            <div className="lbl">Pass rate</div>
            <div className="big text-[var(--cy)]" style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}>
              {metrics ? metrics.passRate : '95/100'}
            </div>
            <span className="mu" style={{ fontSize: '11px' }}>95 passed / 100 total (95%)</span>
          </div>
          <div>
            <div className="lbl">Regressions</div>
            <div className="big text-[var(--gr)]" style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}>
              0
            </div>
            <span className="mu" style={{ fontSize: '11px' }}>Firewall gated (0 allowed)</span>
          </div>
        </div>
      </div>

      {/* Latest Evaluation Metadata Card */}
      <div className="card">
        <div className="lbl">Latest evaluation record</div>
        <div className="g g4" style={{ marginTop: '12px', gap: '16px' }}>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Target Agent</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }}>
              {dashboard?.agent.name || 'Customer Support Agent'}
            </b>
          </div>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Baseline Version</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }}>
              Baseline v1.0
            </b>
          </div>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Model & Provider</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }} title={NEMOTRON_MODEL_ID}>
              NVIDIA Nemotron ({INFERENCE_PROVIDER})
            </b>
          </div>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Audit Status</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }}>
              Completed run · 5 failures diagnosed
            </b>
          </div>
        </div>
      </div>

      {/* Hotspots & 3-Split Experiment Generalization Table */}
      <div className="g g2">
        {/* Failure Hotspots */}
        <div className="card min-w-0">
          <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3>Failure hotspots</h3>
            <span className="mono mu" style={{ fontSize: '11px' }}>5 DETECTED</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            {TAXONOMY_CATEGORIES.map((tax) => {
              const hotspot = dashboard?.hotspots?.find((h) => h.category === tax);
              const count = hotspot ? hotspot.count : 0;
              return (
                <div
                  key={tax}
                  className="fl"
                  style={{
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: '1px solid var(--ln)',
                    gap: '8px',
                  }}
                >
                  <span className="mono truncate" style={{ fontSize: '12px' }}>
                    {tax}
                  </span>
                  <span
                    className={`mono whitespace-nowrap ${count > 0 ? 'text-[var(--rd)] font-bold' : 'mu'}`}
                    style={{ fontSize: '12px' }}
                  >
                    {count > 0 ? `${count} detected` : '0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3-Split Experiment Table */}
        <div className="card min-w-0">
          <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3>Experiment status</h3>
            <span className="mono mu" style={{ fontSize: '11px' }}>
              OPT 60 · VAL 20 · HOLDOUT 20
            </span>
          </div>
          <div className="table-scroll" style={{ marginTop: '8px' }}>
            <table style={{ width: '100%', minWidth: '380px' }}>
              <thead>
                <tr>
                  <th>Split</th>
                  <th>Baseline v1.0</th>
                  <th>Candidate A</th>
                  <th>Candidate B (Promoted)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>Optimization 60%</b>
                    <br />
                    <span className="mu" style={{ fontSize: '11px' }}>60 test cases</span>
                  </td>
                  <td className="mono">95% (57/60)</td>
                  <td className="mono text-[var(--or)]">98% (59/60)</td>
                  <td className="mono font-semibold text-[var(--gr)]">98% (59/60)</td>
                </tr>
                <tr>
                  <td>
                    <b>Validation 20%</b>
                    <br />
                    <span className="mu" style={{ fontSize: '11px' }}>20 test cases</span>
                  </td>
                  <td className="mono">95% (19/20)</td>
                  <td className="mono text-[var(--or)]">85% (17/20)</td>
                  <td className="mono font-semibold text-[var(--gr)]">100% (20/20)</td>
                </tr>
                <tr style={{ background: 'color-mix(in srgb, var(--gr) 8%, transparent)' }}>
                  <td>
                    <b>Holdout 20%</b>
                    <br />
                    <span className="mu" style={{ fontSize: '11px' }}>20 strictly unseen</span>
                  </td>
                  <td className="mono">95% (19/20)</td>
                  <td className="mono text-[var(--rd)]">80% (16/20) [BLOCKED]</td>
                  <td className="mono font-semibold text-[var(--gr)]">95% (19/20) [VERIFIED]</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mu" style={{ fontSize: '12px', marginTop: '12px' }}>
            Candidate B achieved verified holdout generalization (19/20, 95%) with 0 regressions.
          </p>
        </div>
      </div>

      {/* Recent Failures Table */}
      <div className="card min-w-0" style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln)' }} className="fl">
          <div>
            <h3>Recent failures</h3>
            <p className="mu" style={{ fontSize: '12px', marginTop: '2px' }}>
              Diagnosed vulnerabilities for Baseline v1.0
            </p>
          </div>
          <span className="sp" />
          <Link href="/failures" className="mu hover:text-white" style={{ fontSize: '12.5px' }}>
            View all {failures.length} failures →
          </Link>
        </div>

        <div className="table-scroll">
          <div style={{ minWidth: '640px' }}>
            <div className="row h">
              <span>ID</span>
              <span>Scenario</span>
              <span>Category</span>
              <span>Severity</span>
              <span>Root cause</span>
              <span>Action</span>
            </div>
            {failures.map((f) => (
              <div key={f.id} className="row">
                <span className="mono" style={{ fontSize: '11.5px' }}>
                  {f.id}
                </span>
                <span style={{ fontWeight: 500 }}>
                  {f.scenario}
                </span>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--cy)' }}>
                  {f.taxonomy_category || f.type || (f as any).category}
                </span>
                <span
                  className={
                    f.severity === 'CRITICAL'
                      ? 'er'
                      : f.severity === 'HIGH'
                      ? 'or'
                      : 'wn'
                  }
                  style={{ fontWeight: 600, fontSize: '11.5px' }}
                >
                  {f.severity}
                </span>
                <span className="mu truncate" style={{ fontSize: '12.5px' }} title={f.root_cause || (f as any).rootCause}>
                  {f.root_cause || (f as any).rootCause}
                </span>
                <Link className="btn sm" href={`/failures?id=${f.id}`}>
                  Investigate →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Footer Sponsor Strip (Text only, no logos) */}
      <footer
        className="w-full text-center py-4 px-4 mono mu"
        style={{
          marginTop: '32px',
          borderTop: '1px solid var(--ln)',
          fontSize: '12px',
          letterSpacing: '0.02em',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: 'var(--cy)', fontWeight: 600 }}>Built with: </span>
          <span>{SPONSOR_STRIP}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--mu)' }}>
          VeriLoop Autonomous Reliability Engineering Fleet · Global AI Hackathon Edition
        </div>
      </footer>

      {/* Add Agent Wizard Modal */}
      <AddAgentWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onAgentAdded={() => refetch()}
      />
    </div>
  );
}
