'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, Experiment, EvalProgressEvent } from '@/lib/api';
import { NEMOTRON_MODEL_ID, INFERENCE_PROVIDER, CANONICAL_SPLITS } from '@/lib/config';
import { Play, Sparkles, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const INTERVENTION_TYPES = [
  ['RETRIEVAL', 'Change source priority, recency decay & vector index weighting'],
  ['PROMPT', 'Modify instructions & meta-prompting constraints with XML boundaries'],
  ['TOOL', 'Fix tool schema prerequisites, routing rules and disambiguation'],
  ['GUARDRAIL', 'Add input/output safety validation and prompt injection wrappers'],
  ['MEMORY', 'Fix multi-turn entity retention and explicit state amendment rules'],
  ['WORKFLOW', 'Enforce conditional policy check gates before sensitive actions'],
];

const STAGES = ['Test', 'Diagnose', 'Intervene', 'Validate', 'Prove'];

export default function ExperimentsPage() {
  const [selectedIntervention, setSelectedIntervention] = useState('RETRIEVAL');
  const [isRunningEval, setIsRunningEval] = useState(false);
  const [progressEvents, setProgressEvents] = useState<EvalProgressEvent[]>([]);
  const [currentStageName, setCurrentStageName] = useState<string>('Test');
  const [currentProgressPct, setCurrentProgressPct] = useState<number>(0);

  const {
    data: experiments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Experiment[]>({
    queryKey: ['experiments'],
    queryFn: api.listExperiments,
    staleTime: 5000,
  });

  const handleRunEvaluation = () => {
    setIsRunningEval(true);
    setProgressEvents([]);
    setCurrentProgressPct(0);
    setCurrentStageName('Test');

    api.startEvaluation(
      'agent-cs-01',
      'v1.0',
      (event) => {
        setProgressEvents((prev) => [...prev, event]);
        setCurrentStageName(event.stage);
        setCurrentProgressPct(event.progress ?? 0);
      },
      () => {
        setIsRunningEval(false);
        refetch();
      },
      (err) => {
        setIsRunningEval(false);
        console.error('Experiment evaluation error:', err);
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Title & Headline */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Experiment Lab</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            VeriLoop does not blindly optimize prompts. It evaluates targeted candidate interventions against 60/20/20 splits.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={isRunningEval}
          className="btn p sm"
        >
          <Play size={13} fill="currentColor" />
          <span>{isRunningEval ? 'Streaming Evaluation...' : 'Run Evaluation'}</span>
        </button>
      </div>

      {/* Live 5-Step Evaluation Progress Rail & Log */}
      {isRunningEval && (
        <div className="card space-y-4" style={{ borderColor: 'var(--cy)', background: 'rgba(34, 209, 230, 0.04)' }}>
          <div className="fl" style={{ justifyContent: 'space-between' }}>
            <div className="fl" style={{ gap: '8px' }}>
              <span className="bd in animate-pulse">
                <i></i>EVALUATION PIPELINE ACTIVE
              </span>
              <span className="mono mu" style={{ fontSize: '12px' }}>
                Inference: {INFERENCE_PROVIDER} · Model: {NEMOTRON_MODEL_ID}
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
                    {isCurrent ? 'Running...' : isPast ? 'Completed' : 'Pending'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Step Event Logs */}
          <div
            className="mono"
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              background: 'var(--s1)',
              padding: '10px 12px',
              borderRadius: '3px',
              border: '1px solid var(--ln)',
              fontSize: '12px',
              lineHeight: 1.6,
            }}
          >
            {progressEvents.map((ev, i) => (
              <div key={i} className="fl" style={{ gap: '10px', marginBottom: '4px' }}>
                <span className="mu">[{ev.timestamp || '00:00'}]</span>
                <span className="text-[var(--cy)]">[{ev.stage.toUpperCase()}]</span>
                <span>{ev.message}</span>
                <span className="sp" />
                <span className="mu" style={{ fontSize: '10.5px' }}>
                  {NEMOTRON_MODEL_ID} · {INFERENCE_PROVIDER}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 Targeted Intervention Modalities */}
      <div>
        <div className="lbl" style={{ marginBottom: '8px' }}>Targeted intervention modalities</div>
        <div className="g g3">
          {INTERVENTION_TYPES.map(([type, desc]) => (
            <div
              key={type}
              className="card cursor-pointer"
              onClick={() => setSelectedIntervention(type)}
              style={{
                borderColor: selectedIntervention === type ? 'var(--bl)' : undefined,
                boxShadow: selectedIntervention === type ? '0 0 0 1px var(--bl)' : undefined,
              }}
            >
              <span className={`bd ${selectedIntervention === type ? 'in' : ''}`}>
                <i></i>{type}
              </span>
              <p className="mu" style={{ marginTop: '8px', fontSize: '12.5px' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && experiments.length === 0 && (
        <div className="card text-center py-8">
          <RefreshCw className="animate-spin mx-auto mb-2 text-[var(--cy)]" size={20} />
          <div style={{ fontWeight: 600, fontSize: '13px' }}>Loading Candidate Experiments...</div>
          <p className="mu" style={{ fontSize: '11px', marginTop: '2px' }}>
            Fetching 60/20/20 generalization splits and regression verifications
          </p>
        </div>
      )}

      {isError && (
        <div className="banner" style={{ borderColor: 'var(--rd)', color: 'var(--rd)' }}>
          Failed to load candidate experiments: {(error as Error)?.message || 'Network error'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && experiments.length === 0 && (
        <div className="empty">
          <b>No experiments recorded</b>
          <span>Run an evaluation to generate candidate fixes and verify holdout generalization.</span>
          <button className="btn p sm" onClick={handleRunEvaluation}>
            Run Evaluation
          </button>
        </div>
      )}

      {/* Candidate Comparison Cards with Explicit Verdicts */}
      {!isLoading && experiments.length > 0 && (
        <div className="space-y-4">
          <div className="fl" style={{ justifyContent: 'space-between' }}>
            <div className="lbl">Candidate versions under test</div>
            <span className="mono mu" style={{ fontSize: '11px' }}>
              INFERENCE: {INFERENCE_PROVIDER} · REASONING: {NEMOTRON_MODEL_ID}
            </span>
          </div>

          <div className="g g2">
            {experiments.map((cand) => {
              const isVerified = cand.verdict === 'VERIFIED';
              return (
                <div
                  key={cand.id}
                  className="card space-y-3"
                  style={{
                    borderColor: isVerified ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)',
                    background: isVerified ? 'rgba(52, 211, 153, 0.03)' : 'rgba(248, 113, 113, 0.03)',
                  }}
                >
                  <div className="fl" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <span className="mono mu" style={{ fontSize: '11px' }}>
                        {cand.version} · {cand.interventionType}
                      </span>
                      <h3 style={{ fontSize: '16px', marginTop: '2px' }}>{cand.name}</h3>
                    </div>
                    <span className={`bd ${isVerified ? 'ok' : 'er'}`}>
                      <i></i>
                      {isVerified ? 'VERIFIED' : 'REJECTED'}
                    </span>
                  </div>

                  <p className="mu" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                    {cand.description}
                  </p>

                  {/* 3-Split Score Metrics */}
                  <div className="g g3" style={{ background: 'var(--s2)', padding: '10px', borderRadius: '4px' }}>
                    <div>
                      <div className="lbl" style={{ fontSize: '10.5px' }}>Optimization (60)</div>
                      <div className="mono font-semibold" style={{ fontSize: '13px', marginTop: '2px' }}>
                        {cand.optimizationScore}
                      </div>
                    </div>
                    <div>
                      <div className="lbl" style={{ fontSize: '10.5px' }}>Validation (20)</div>
                      <div className="mono font-semibold" style={{ fontSize: '13px', marginTop: '2px' }}>
                        {cand.validationScore}
                      </div>
                    </div>
                    <div>
                      <div className="lbl" style={{ fontSize: '10.5px' }}>Holdout (20)</div>
                      <div
                        className={`mono font-semibold ${isVerified ? 'text-[var(--gr)]' : 'text-[var(--rd)]'}`}
                        style={{ fontSize: '13px', marginTop: '2px' }}
                      >
                        {cand.holdoutScore}
                      </div>
                    </div>
                  </div>

                  {/* Verdict Details */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--ln)', fontSize: '12px' }}>
                    <div className="fl" style={{ justifyContent: 'space-between' }}>
                      <span className="mu">Regressions:</span>
                      <span className={`mono font-bold ${cand.regressionCount === 0 ? 'text-[var(--gr)]' : 'text-[var(--rd)]'}`}>
                        {cand.regressionCount === 0 ? '0 detected (FIREWALL CLEARED)' : `${cand.regressionCount} BROKEN CASES`}
                      </span>
                    </div>
                    <p style={{ marginTop: '6px', color: isVerified ? 'var(--tx)' : 'var(--or)', fontSize: '12px' }}>
                      {cand.verdictReason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 60/20/20 Split Breakdown Table */}
      <div className="card">
        <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className="lbl">Generalization Split Breakdown</div>
          <span className="mono mu" style={{ fontSize: '11px' }}>
            60% OPT (60) · 20% VAL (20) · 20% HOLDOUT (20)
          </span>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '6px' }}>
          <table>
            <thead>
              <tr>
                <th>Split</th>
                <th>Baseline v1.0</th>
                <th>Candidate A</th>
                <th>Candidate B (Promoted candidate)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>Optimization</b>
                  <br />
                  <span className="mu" style={{ fontSize: '11px' }}>60 cases (60%)</span>
                </td>
                <td className="mono">95% (57/60)</td>
                <td className="mono text-[var(--or)]">98% (59/60)</td>
                <td className="mono font-semibold text-[var(--gr)]">98% (59/60)</td>
              </tr>
              <tr>
                <td>
                  <b>Validation</b>
                  <br />
                  <span className="mu" style={{ fontSize: '11px' }}>20 cases (20%)</span>
                </td>
                <td className="mono">95% (19/20)</td>
                <td className="mono text-[var(--or)]">85% (17/20)</td>
                <td className="mono font-semibold text-[var(--gr)]">100% (20/20)</td>
              </tr>
              <tr style={{ background: 'color-mix(in srgb, var(--gr) 8%, transparent)' }}>
                <td>
                  <b>Holdout</b>
                  <br />
                  <span className="mu" style={{ fontSize: '11px' }}>
                    20 cases (Strictly isolated from tuning)
                  </span>
                </td>
                <td className="mono">95% (19/20)</td>
                <td className="mono text-[var(--rd)]">80% (16/20) [BLOCKED]</td>
                <td className="mono font-semibold text-[var(--gr)]">95% (19/20) [VERIFIED]</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mu" style={{ fontSize: '12.5px', marginTop: '12px' }}>
          VeriLoop proves that Candidate B does not simply overfit to optimization probes. It generalizes cleanly to unseen holdout cases with zero regressions.
        </p>
      </div>

      {/* Generalization Check Card with Badges and Navigation */}
      <div className="card">
        <div className="lbl">Generalization check</div>
        <h3 style={{ margin: '6px 0 12px', fontSize: '16px' }}>
          Did the candidate fix actually generalize?
        </h3>
        <div className="fl" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span className="bd ok">
            <i></i>Optimization · PASS (98%)
          </span>
          <span className="bd ok">
            <i></i>Validation · PASS (100%)
          </span>
          <span className="bd ok">
            <i></i>Holdout · PASS (95%)
          </span>
          <span className="bd ok">
            <i></i>Regression · 0 (CLEARED)
          </span>
          <span className="bd ok">
            <i></i>FINAL VERDICT: VERIFIED
          </span>
        </div>

        <div className="fl" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--ln)' }}>
          <Link className="btn p" href="/regression">
            Inspect in Regression Firewall →
          </Link>
          <Link className="btn" href="/reports">
            Generate Verification Report
          </Link>
        </div>
      </div>
    </div>
  );
}
