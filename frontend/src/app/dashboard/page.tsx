'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, streamEvaluation, EvalProgressEvent } from '@/lib/api';
import { Play } from 'lucide-react';
import Link from 'next/link';

const TAXONOMY_CATEGORIES = [
  'POLICY_FAILURE',
  'SAFETY_FAILURE',
  'GROUNDING_FAILURE',
  'TOOL_FAILURE',
  'RETRIEVAL_FAILURE',
  'CONTEXT_FAILURE',
  'INSTRUCTION_FAILURE',
];

const DEMO_EXP = {
  id: 'EXP-DEMO-1',
  title: 'Fix outdated policy retrieval',
  cols: ['Baseline', 'Candidate A', 'Candidate B'],
  iv: ['—', 'RETRIEVAL · prioritize latest policy', 'PROMPT · verify policy version'],
  rows: [
    ['Optimization', ['62%', '88%', '79%']],
    ['Validation', ['60%', '86%', '74%']],
    ['Holdout', ['58%', '85%', '66%']],
  ],
};

export default function DashboardPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<EvalProgressEvent[]>([]);
  const [currentStage, setCurrentStage] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);

  const { data: demoStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['demo-status'],
    queryFn: api.demoStatus,
    refetchInterval: 5000,
  });

  const eval_ = demoStatus?.latest_evaluation;
  const reliability = eval_?.reliability_score !== null && eval_?.reliability_score !== undefined
    ? Math.round(eval_.reliability_score * 100)
    : null;

  const { data: failures = [], refetch: refetchFailures } = useQuery({
    queryKey: ['dashboard-failures', eval_?.id],
    queryFn: () => (eval_?.id ? api.listFailures(eval_.id) : []),
    enabled: !!eval_?.id && !isRunning,
  });

  function handleRunEvaluation() {
    if (!demoStatus?.agent_id || !demoStatus?.baseline_version_id) return;
    setIsRunning(true);
    setProgress([]);
    setCurrentProgress(0);

    streamEvaluation(
      demoStatus.agent_id,
      demoStatus.baseline_version_id,
      undefined,
      (event) => {
        setProgress((prev) => [...prev, event]);
        setCurrentStage(event.stage);
        setCurrentProgress(event.progress ?? 0);
        if (event.stage === 'completed' || event.stage === 'error') {
          setIsRunning(false);
          refetchStatus();
          refetchFailures();
        }
      },
      (err) => {
        setIsRunning(false);
        console.error('Evaluation error:', err);
      },
      () => {
        setIsRunning(false);
        refetchStatus();
        refetchFailures();
      }
    );
  }

  const agentStatus = eval_
    ? eval_.critical_failures === 0
      ? 'VERIFIED'
      : 'NEEDS ATTENTION'
    : 'AWAITING EVALUATION';

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)] w-full min-w-0">
      {/* Header Section */}
      <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--ln)' }}>
        <div className="fl">
          <span className={`bd ${eval_?.critical_failures === 0 ? 'ok' : 'wn'}`}>
            <i></i>
            {agentStatus}
          </span>
          <span className="mono mu" style={{ fontSize: '12px' }}>
            AGENT V1.0
          </span>
        </div>

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
          <div className="fl" style={{ gap: '10px' }}>
            <button
              className="btn p whitespace-nowrap"
              onClick={handleRunEvaluation}
              disabled={isRunning}
            >
              <Play size={13} fill="currentColor" />
              <span>{isRunning ? 'Running evaluation...' : 'Run Evaluation'}</span>
            </button>
            <Link className="btn whitespace-nowrap" href="/reports">
              View latest report
            </Link>
          </div>
        </div>
      </div>

      {/* Reliability Score & Top Metric Cards */}
      <div className="g g21">
        <div className="card">
          <div className="lbl">VeriLoop reliability score</div>
          <div className="fl" style={{ margin: '8px 0', flexWrap: 'wrap', gap: '8px', alignItems: 'baseline' }}>
            <span
              className={`big ${reliability !== null ? (reliability >= 70 ? 'text-[var(--gr)]' : 'text-[var(--rd)]') : 'mu'}`}
              style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}
            >
              {reliability !== null ? `${reliability}%` : '—'}
            </span>
            <span className="mu" style={{ fontSize: '15px' }}>/100</span>
            <span className={`bd ${reliability !== null ? (reliability >= 70 ? 'ok' : 'er') : 'wn'}`}>
              <i></i>
              {reliability !== null ? (reliability >= 70 ? 'PASS' : 'FAIL') : 'Awaiting evaluation'}
            </span>
          </div>
          <p className="mu" style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
            A product-level metric, not an industry standard. Raw category scores stay visible beside it.
          </p>
        </div>

        <div className="card g g2" style={{ gap: '14px' }}>
          <div>
            <div className="lbl">Critical failures</div>
            <div
              className={`big ${eval_?.critical_failures ? 'text-[var(--rd)]' : 'mu'}`}
              style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}
            >
              {eval_ ? eval_.critical_failures : '—'}
            </div>
          </div>
          <div>
            <div className="lbl">High-severity</div>
            <div
              className={`big ${eval_?.high_failures ? 'text-[var(--or)]' : 'mu'}`}
              style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}
            >
              {eval_ ? eval_.high_failures : '—'}
            </div>
          </div>
          <div>
            <div className="lbl">Pass rate</div>
            <div className="big text-[var(--cy)]" style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}>
              {eval_ ? `${eval_.passed_tests}/${eval_.total_tests}` : '—'}
            </div>
          </div>
          <div>
            <div className="lbl">Regressions</div>
            <div className="big text-[var(--gr)]" style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}>
              0
            </div>
          </div>
        </div>
      </div>

      {/* Latest Evaluation Metadata Card */}
      <div className="card">
        <div className="lbl">Latest evaluation</div>
        <div className="g g4" style={{ marginTop: '12px', gap: '16px' }}>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Agent</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }}>Customer Support Agent</b>
          </div>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Version</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }}>v1.0 (baseline)</b>
          </div>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Model</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }}>NVIDIA Nemotron 70B</b>
          </div>
          <div className="min-w-0">
            <span className="mu" style={{ fontSize: '12px' }}>Status</span>
            <br />
            <b className="truncate block" style={{ fontSize: '14px' }}>{eval_ ? 'Completed audit' : 'No run yet'}</b>
          </div>
        </div>
      </div>

      {/* Hotspots & Experiment Status Split Table */}
      <div className="g g2">
        <div className="card min-w-0">
          <h3>Failure hotspots</h3>
          <div style={{ marginTop: '8px' }}>
            {TAXONOMY_CATEGORIES.map((tax) => {
              const count = failures.filter(
                (f) => (f.taxonomy_category || f.category)?.toUpperCase() === tax
              ).length;
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
                    {count > 0 ? `${count} detected` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card min-w-0">
          <h3>Experiment status (60/20/20 Generalization)</h3>
          <div className="table-scroll" style={{ marginTop: '8px' }}>
            <table style={{ width: '100%', minWidth: '380px' }}>
              <thead>
                <tr>
                  <th>Split</th>
                  {DEMO_EXP.cols.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_EXP.rows.map(([splitName, values]) => (
                  <tr
                    key={splitName as string}
                    style={
                      splitName === 'Holdout'
                        ? { background: 'color-mix(in srgb, var(--gr) 8%, transparent)' }
                        : undefined
                    }
                  >
                    <td>
                      <b>{splitName as string}</b>
                      {splitName === 'Holdout' && (
                        <>
                          <br />
                          <span className="mu" style={{ fontSize: '11px' }}>
                            Never seen during optimization
                          </span>
                        </>
                      )}
                    </td>
                    {(values as string[]).map((v, i) => (
                      <td key={i} className="mono">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Failures Table */}
      <div className="card min-w-0" style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln)' }} className="fl">
          <h3>Recent failures</h3>
          <span className="sp" />
          <Link href="/failures" className="mu hover:text-white" style={{ fontSize: '12.5px' }}>
            View all failures →
          </Link>
        </div>

        {failures.length === 0 ? (
          <div className="empty" style={{ margin: '18px' }}>
            <b>No failures yet</b>
            <span>Run your first evaluation to discover and diagnose agent vulnerabilities.</span>
            <button className="btn p sm" onClick={handleRunEvaluation}>
              Run Evaluation
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <div style={{ minWidth: '640px' }}>
              <div className="row h">
                <span>ID</span>
                <span>Scenario</span>
                <span>Type</span>
                <span>Severity</span>
                <span>Root cause</span>
                <span>Action</span>
              </div>
              {failures.slice(0, 5).map((f) => (
                <div key={f.id} className="row">
                  <span className="mono" style={{ fontSize: '11.5px' }}>
                    {f.id.slice(0, 8)}
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    {f.failure_type || f.category || 'Policy mismatch'}
                  </span>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--cy)' }}>
                    {f.taxonomy_category || f.category}
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
                  <span className="mu truncate" style={{ fontSize: '12.5px' }}>
                    {f.root_cause || f.root_cause_hypothesis || 'Outdated policy retrieval'}
                  </span>
                  <Link className="btn sm" href={`/failures?id=${f.id}`}>
                    Investigate
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
