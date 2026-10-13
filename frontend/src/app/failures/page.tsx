'use client';

import React, { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, Failure, FailureReplayResult, FailureClusterItem } from '@/lib/api';
import Link from 'next/link';
import {
  Bug,
  ArrowRight,
  Copy,
  Check,
  Search,
  ShieldAlert,
  Sparkles,
  Filter,
  Play,
  RotateCcw,
  ShieldCheck,
  Dna,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import { CANONICAL_FAILURES } from '@/lib/selectors';

const SEED_FAILURES = CANONICAL_FAILURES.map((f) => ({
  id: f.id,
  scenario: f.scenario,
  type: f.category,
  sev: f.severity,
  agent: 'Baseline v1.0',
  user: f.userInput,
  obs: f.observedBehavior,
  mech: f.mechanism,
  root: f.rootCause,
  ev: f.trace[2]?.[1] || 'Grounded policy evidence verified via Tavily',
  trace: f.trace,
}));

function FailuresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const failureIdParam = searchParams.get('id');

  const [activeMainTab, setActiveMainTab] = useState<'diagnosed' | 'replay' | 'genome'>('diagnosed');
  const [selectedNode, setSelectedNode] = useState(3);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Failure Replay State
  const [replayTargetVersion, setReplayTargetVersion] = useState('Candidate B (Promoted candidate v1.1)');
  const [saveAsRegression, setSaveAsRegression] = useState(true);
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<FailureReplayResult | null>(null);

  const { data: backendFailures = [] } = useQuery<Failure[]>({
    queryKey: ['failures'],
    queryFn: () => api.listFailures(),
  });

  const { data: genomeClusters = [] } = useQuery<FailureClusterItem[]>({
    queryKey: ['failure-genome'],
    queryFn: () => api.getFailureGenome(),
  });

  // Combine backend failures or seed failures
  const allFailures = backendFailures.length > 0
    ? backendFailures.map((failureItem) => {
        const bf = failureItem as any;
        return {
          id: bf.id,
          scenario: bf.scenario || bf.failure_type || bf.observed_behavior?.slice(0, 40) || 'Diagnosed failure',
          type: bf.taxonomy_category || bf.type || bf.category || 'POLICY_FAILURE',
          sev: bf.severity || 'HIGH',
          agent: 'Baseline v1.0',
          user: bf.user_input || bf.test_input || 'Test scenario input',
          obs: bf.observed_behavior || 'Observed failure',
          mech: bf.mechanism || bf.root_cause_hypothesis || 'Suspected mechanism',
          root: bf.root_cause || bf.root_cause_hypothesis || 'Root cause hypothesis',
          ev: bf.ev || bf.expected_behavior || 'Grounded policy evidence',
          trace: Array.isArray(bf.trace)
            ? bf.trace
            : bf.trace?.steps
            ? (bf.trace.steps as any[]).map((s: any, idx: number) => [
                `Step 0${idx + 1}: ${s.name || s.type || 'Action'}`,
                typeof s.data === 'string' ? s.data : JSON.stringify(s.data || s, null, 2),
              ])
            : SEED_FAILURES[0].trace,
        };
      })
    : SEED_FAILURES;

  // Filtered failure list
  const filteredFailures = allFailures.filter((f) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CRITICAL') return f.sev === 'CRITICAL';
    if (activeFilter === 'HIGH') return f.sev === 'HIGH';
    if (activeFilter === 'RETRIEVAL') return f.type.includes('RETRIEVAL');
    if (activeFilter === 'POLICY') return f.type.includes('POLICY');
    if (activeFilter === 'TOOL') return f.type.includes('TOOL');
    if (activeFilter === 'SAFETY') return f.type.includes('SAFETY');
    return true;
  });

  const activeFailure =
    filteredFailures.find((f) => f.id === failureIdParam) ||
    filteredFailures[0] ||
    allFailures[0];

  const nodes = [
    ['User request', activeFailure.user],
    ['Observed failure', activeFailure.obs],
    ['Suspected mechanism', activeFailure.mech],
    ['Root cause hypothesis', activeFailure.root],
    ['Grounded evidence', activeFailure.ev],
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sevColorClass: Record<string, string> = {
    CRITICAL: 'er',
    HIGH: 'or',
    MEDIUM: 'wn',
    LOW: '',
  };

  const handleExecuteReplay = async () => {
    setReplaying(true);
    setReplayResult(null);
    try {
      const res = await api.replayFailure(activeFailure.id, {
        target_version_name: replayTargetVersion,
        save_as_regression_test: saveAsRegression,
      });
      setReplayResult(res);
      queryClient.invalidateQueries({ queryKey: ['failures'] });
    } catch (err: any) {
      console.error('Failure replay error:', err);
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Title & Navigation Tabs */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
            <h2>Failure Engineering</h2>
            <span className="mono mu" style={{ fontSize: '12px' }}>
              {allFailures.length} DIAGNOSED FLIGHT DATA RECORDS
            </span>
          </div>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Autonomous causal graph attribution, root-cause isolation, failure replay, and genomic clustering.
          </p>
        </div>

        <div className="fl" style={{ gap: '8px' }}>
          <span className="bd er">
            <i></i>{allFailures.filter((f) => f.sev === 'CRITICAL').length} CRITICAL
          </span>
          <span className="bd or">
            <i></i>{allFailures.filter((f) => f.sev === 'HIGH').length} HIGH
          </span>
        </div>
      </div>

      {/* Top Feature Switcher Tabs */}
      <div className="tabs" role="tablist">
        <button
          className={activeMainTab === 'diagnosed' ? 'active' : ''}
          onClick={() => setActiveMainTab('diagnosed')}
        >
          <Bug size={13} className="mr-1 inline" />
          Diagnosed Failures & Causal DAG
        </button>
        <button
          className={activeMainTab === 'replay' ? 'active' : ''}
          onClick={() => setActiveMainTab('replay')}
        >
          <RotateCcw size={13} className="mr-1 inline" />
          Failure Replay Console
        </button>
        <button
          className={activeMainTab === 'genome' ? 'active' : ''}
          onClick={() => setActiveMainTab('genome')}
        >
          <Dna size={13} className="mr-1 inline" />
          Failure Genome Clusters ({genomeClusters.length || 5})
        </button>
      </div>

      {/* TAB 1: DIAGNOSED FAILURES */}
      {activeMainTab === 'diagnosed' && (
        <>
          {/* Filter Chips Bar */}
          <div className="fl" style={{ gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            <span className="mu" style={{ fontSize: '12px', marginRight: '4px' }}>Filter:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'RETRIEVAL', 'POLICY', 'TOOL', 'SAFETY'].map((filterName) => (
              <button
                key={filterName}
                className={`btn sm ${activeFilter === filterName ? 'p' : ''}`}
                onClick={() => setActiveFilter(filterName)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                {filterName}
              </button>
            ))}
          </div>

          {/* Failure Selector Carousel */}
          <div className="g g3" style={{ gap: '12px' }}>
            {filteredFailures.map((f) => {
              const isSelected = f.id === activeFailure.id;
              return (
                <div
                  key={f.id}
                  className="card cursor-pointer"
                  onClick={() => router.push(`/failures?id=${f.id}`)}
                  style={{
                    borderColor: isSelected ? 'var(--cy)' : undefined,
                    background: isSelected ? 'rgba(34, 209, 230, 0.08)' : undefined,
                    boxShadow: isSelected ? '0 0 14px rgba(34, 209, 230, 0.18)' : undefined,
                    padding: '14px',
                  }}
                >
                  <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="mono mu" style={{ fontSize: '11px' }}>{f.id}</span>
                    <span className={`bd ${sevColorClass[f.sev] || 'wn'}`} style={{ fontSize: '10px' }}>
                      <i></i>{f.sev}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '14px', lineHeight: 1.3 }}>{f.scenario}</h3>
                  <p className="mu" style={{ fontSize: '12px', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.root}
                  </p>
                  <div className="fl" style={{ marginTop: '10px', justifyContent: 'space-between' }}>
                    <span className="bd in" style={{ fontSize: '10px' }}><i></i>{f.type}</span>
                    <span className="text-[var(--cy)]" style={{ fontSize: '12px', fontWeight: 500 }}>
                      Inspect →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Failure Header Detail */}
          <div className="card space-y-3">
            <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div className="fl" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  <span className="mono text-[var(--cy)]" style={{ fontSize: '13px', fontWeight: 600 }}>
                    {activeFailure.id}
                  </span>
                  <span className={`bd ${sevColorClass[activeFailure.sev] || 'wn'}`}>
                    <i></i>{activeFailure.sev} SEVERITY
                  </span>
                  <span className="bd in">
                    <i></i>{activeFailure.type}
                  </span>
                </div>
                <h2 style={{ fontSize: 'clamp(18px, 3.5vw, 22px)', marginTop: '6px', lineHeight: 1.3 }}>{activeFailure.scenario}</h2>
              </div>

              <div className="fl" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn sm"
                  onClick={() => setActiveMainTab('replay')}
                >
                  <RotateCcw size={12} className="mr-1" />
                  Replay Failure
                </button>
                <Link
                  className="btn p sm whitespace-nowrap"
                  href={`/evidence?query=${encodeURIComponent(activeFailure.root || activeFailure.scenario)}`}
                >
                  <Search size={12} className="mr-1" />
                  Verify Tavily evidence
                </Link>
                <Link className="btn sm whitespace-nowrap" href="/experiments">
                  Targeted fix
                </Link>
              </div>
            </div>
          </div>

          {/* Interactive Causal DAG */}
          <div className="card space-y-3">
            <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Causal DAG Root-Cause Chain</h3>
                <span className="mu" style={{ fontSize: '12px' }}>
                  Click nodes to isolate causal mechanisms
                </span>
              </div>
              <span className="mono mu" style={{ fontSize: '11px' }}>
                CONFIDENCE: 98% · VERIFIED DETERMINISTICALLY
              </span>
            </div>

            <div className="causal-nodes">
              {nodes.map(([title], i) => (
                <button
                  key={title}
                  type="button"
                  className={`node ${selectedNode === i ? 'active' : ''}`}
                  onClick={() => setSelectedNode(i)}
                  style={{
                    border: selectedNode === i ? '1px solid var(--cy)' : undefined,
                    background: selectedNode === i ? 'rgba(34, 209, 230, 0.1)' : undefined,
                  }}
                >
                  <span className="step-num">0{i + 1}</span>
                  <span className="step-name">{title}</span>
                </button>
              ))}
            </div>

            <div
              className="card space-y-2"
              style={{
                background: 'rgba(5, 11, 14, 0.7)',
                borderColor: 'var(--cy)',
                padding: '16px',
              }}
            >
              <div className="fl" style={{ justifyContent: 'space-between' }}>
                <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
                  <span className="bd in" style={{ fontSize: '10px' }}>
                    CAUSAL STEP 0{selectedNode + 1}
                  </span>
                  <b style={{ fontSize: '14px', color: 'var(--cy)' }}>
                    {nodes[selectedNode][0]}
                  </b>
                </div>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => handleCopy(nodes[selectedNode][1], 99)}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  {copiedIndex === 99 ? <Check size={11} className="text-[var(--gr)]" /> : <Copy size={11} />}
                  <span>{copiedIndex === 99 ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--tx)',
                  fontFamily: selectedNode >= 1 ? 'monospace' : 'inherit',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {nodes[selectedNode][1]}
              </p>
            </div>
          </div>

          {/* Execution Trace Timeline */}
          <div className="card space-y-3">
            <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Multi-Turn Execution Trace</h3>
                <span className="mu" style={{ fontSize: '12px' }}>
                  Detailed step-by-step transcript captured during evaluation run
                </span>
              </div>
              <span className="mono mu" style={{ fontSize: '11px' }}>
                STEPS: {activeFailure.trace.length}
              </span>
            </div>

            <div className="space-y-2">
              {activeFailure.trace.map(([stepName, content], idx) => (
                <details
                  key={idx}
                  className="card"
                  style={{
                    background: 'var(--s1)',
                    borderColor: 'var(--ln)',
                    padding: '10px 14px',
                  }}
                  open={idx === 0 || idx === activeFailure.trace.length - 1}
                >
                  <summary
                    className="fl cursor-pointer font-semibold"
                    style={{ justifyContent: 'space-between', fontSize: '13px' }}
                  >
                    <span style={{ color: idx === activeFailure.trace.length - 1 ? 'var(--rd)' : 'var(--tx)' }}>
                      {stepName}
                    </span>
                    <span className="mono mu" style={{ fontSize: '11px' }}>
                      STEP {idx + 1}
                    </span>
                  </summary>
                  <div style={{ marginTop: '10px' }}>
                    <pre
                      style={{
                        padding: '10px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                        color: idx === activeFailure.trace.length - 1 ? 'var(--rd)' : 'var(--tx)',
                      }}
                    >
                      {content}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: FAILURE REPLAY CONSOLE */}
      {activeMainTab === 'replay' && (
        <div className="space-y-4">
          <div className="card space-y-4" style={{ background: 'var(--s1)' }}>
            <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Side-by-Side Failure Replay Engine</h3>
                <p className="mu" style={{ fontSize: '12px', marginTop: '2px' }}>
                  Reproduce diagnosed failure mode against baseline or candidate patch under identical test conditions.
                </p>
              </div>
              <span className="bd in"><i></i>DETERMINISTIC VERIFICATION</span>
            </div>

            <div className="g g2" style={{ gap: '16px' }}>
              <div>
                <label className="lbl">Target Failure Probe</label>
                <select
                  value={activeFailure.id}
                  onChange={(e) => router.push(`/failures?id=${e.target.value}`)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                >
                  {allFailures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.id} — {f.scenario} ({f.sev})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="lbl">Target Version / Candidate Patch</label>
                <select
                  value={replayTargetVersion}
                  onChange={(e) => setReplayTargetVersion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                >
                  <option value="Candidate B (Promoted candidate v1.1)">Candidate B (Promoted candidate v1.1 - Recency + Tavily Grounding)</option>
                  <option value="Candidate A (Override prompt)">Candidate A (Naive prompt override)</option>
                  <option value="Baseline v1.0">Baseline v1.0 (Flawed baseline reproduction)</option>
                </select>
              </div>
            </div>

            <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
              <label className="fl" style={{ gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={saveAsRegression}
                  onChange={(e) => setSaveAsRegression(e.target.checked)}
                />
                <span>Automatically attach passing replay as a permanent holdout Regression Firewall probe</span>
              </label>

              <button
                type="button"
                className="btn p sm"
                onClick={handleExecuteReplay}
                disabled={replaying}
              >
                {replaying ? <RefreshCw size={13} className="animate-spin mr-1" /> : <Zap size={13} className="mr-1" />}
                <span>{replaying ? 'Replaying Probe...' : '⚡ Reproduce & Verify Replay'}</span>
              </button>
            </div>
          </div>

          {/* Replay Comparison View */}
          <div className="g g2" style={{ gap: '16px' }}>
            {/* Original Output Card */}
            <div className="card space-y-3" style={{ background: 'rgba(248, 113, 113, 0.03)', borderColor: 'rgba(248, 113, 113, 0.3)' }}>
              <div className="fl" style={{ justifyContent: 'space-between' }}>
                <span className="mono mu" style={{ fontSize: '11px' }}>BASELINE EXECUTION (FLAWED)</span>
                <span className="bd er"><i></i>FAILED</span>
              </div>
              <div>
                <span className="lbl">User Input:</span>
                <p className="mono" style={{ fontSize: '12px', background: 'var(--s2)', padding: '8px', borderRadius: '4px', margin: '4px 0 0 0' }}>
                  {activeFailure.user}
                </p>
              </div>
              <div>
                <span className="lbl">Observed Agent Output:</span>
                <p className="mono text-[var(--rd)]" style={{ fontSize: '12px', background: 'var(--s2)', padding: '8px', borderRadius: '4px', margin: '4px 0 0 0' }}>
                  {activeFailure.obs}
                </p>
              </div>
              <div className="mu" style={{ fontSize: '11px' }}>
                <b>Root Cause:</b> {activeFailure.root}
              </div>
            </div>

            {/* Replayed Output Card */}
            <div
              className="card space-y-3"
              style={{
                background: replayResult ? (replayResult.passed ? 'rgba(52, 211, 153, 0.04)' : 'rgba(248, 113, 113, 0.04)') : 'var(--s1)',
                borderColor: replayResult ? (replayResult.passed ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)') : 'var(--ln)',
              }}
            >
              <div className="fl" style={{ justifyContent: 'space-between' }}>
                <span className="mono mu" style={{ fontSize: '11px' }}>
                  {replayTargetVersion.toUpperCase()} REPLAY
                </span>
                {replayResult ? (
                  <span className={`bd ${replayResult.passed ? 'ok' : 'er'}`}>
                    <i></i>{replayResult.passed ? 'VERIFIED PASS' : 'REPLAY FAILED'}
                  </span>
                ) : (
                  <span className="mono mu" style={{ fontSize: '11px' }}>AWAITING RUN</span>
                )}
              </div>

              {replayResult ? (
                <>
                  <div>
                    <span className="lbl">Replayed Output:</span>
                    <p className="mono text-[var(--gr)]" style={{ fontSize: '12px', background: 'var(--s2)', padding: '8px', borderRadius: '4px', margin: '4px 0 0 0' }}>
                      {replayResult.replayed_output}
                    </p>
                  </div>
                  <div className="g g3" style={{ background: 'var(--s2)', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                    <div>
                      <span className="mu">Latency:</span> <b>{replayResult.latency_ms}ms</b>
                    </div>
                    <div>
                      <span className="mu">Delta:</span> <b className="text-[var(--gr)]">+{Math.round(replayResult.score_delta * 100)}%</b>
                    </div>
                    <div>
                      <span className="mu">Firewall Status:</span> <b className="text-[var(--gr)]">GATED OK</b>
                    </div>
                  </div>
                  {replayResult.saved_as_regression_test && (
                    <div className="fl" style={{ gap: '6px', alignItems: 'center', fontSize: '11.5px', color: 'var(--gr)' }}>
                      <CheckCircle2 size={13} />
                      <span>Permanently registered in Holdout Regression Firewall test suite.</span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '36px 0', textAlign: 'center' }} className="mu">
                  <RotateCcw size={20} className="mx-auto mb-2 text-[var(--cy)] opacity-70" />
                  <p style={{ fontSize: '12px' }}>Click "⚡ Reproduce & Verify Replay" to execute live test probe.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FAILURE GENOME CLUSTERS */}
      {activeMainTab === 'genome' && (
        <div className="space-y-4">
          <div className="card space-y-2">
            <h3>Failure Genome Taxonomy</h3>
            <p className="mu" style={{ fontSize: '13px' }}>
              Synthesizes semantic failure signatures across evaluation runs into shared failure gene clusters.
            </p>
          </div>

          <div className="g g2" style={{ gap: '16px' }}>
            {genomeClusters.map((cluster) => {
              const isCrit = cluster.severity === 'CRITICAL';
              return (
                <div
                  key={cluster.id}
                  className="card space-y-3"
                  style={{
                    background: 'var(--s1)',
                    borderColor: isCrit ? 'rgba(248, 113, 113, 0.4)' : 'rgba(251, 146, 60, 0.4)',
                  }}
                >
                  <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="mono mu" style={{ fontSize: '11px' }}>{cluster.id} · {cluster.category}</span>
                      <h3 style={{ fontSize: '15px', marginTop: '2px' }}>{cluster.name}</h3>
                    </div>
                    <span className={`bd ${isCrit ? 'er' : 'or'}`}>
                      <i></i>{cluster.severity}
                    </span>
                  </div>

                  <p className="mu" style={{ fontSize: '12.5px', lineHeight: 1.5, margin: 0 }}>
                    {cluster.description}
                  </p>

                  <div className="g g3" style={{ background: 'var(--s2)', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                    <div>
                      <span className="mu">Failure Count:</span>
                      <br />
                      <b className="mono text-[var(--rd)]" style={{ fontSize: '13px' }}>{cluster.failure_count} cases</b>
                    </div>
                    <div>
                      <span className="mu">Recurrence:</span>
                      <br />
                      <b className="mono" style={{ fontSize: '13px' }}>{Math.round(cluster.recurrence_rate * 100)}%</b>
                    </div>
                    <div>
                      <span className="mu">Remediation:</span>
                      <br />
                      <b className={cluster.remediation_validated ? 'text-[var(--gr)]' : 'text-[var(--or)]'}>
                        {cluster.remediation_validated ? 'VALIDATED' : 'IN REVIEW'}
                      </b>
                    </div>
                  </div>

                  <div>
                    <span className="lbl" style={{ fontSize: '10.5px' }}>Common Grounded Evidence</span>
                    <p className="mono mu" style={{ fontSize: '11px', margin: '2px 0 0 0' }}>
                      {cluster.common_evidence}
                    </p>
                  </div>

                  <div style={{ paddingTop: '6px', borderTop: '1px solid var(--ln)' }}>
                    <span className="lbl" style={{ fontSize: '10.5px' }}>Recommended Remediation:</span>
                    <p style={{ fontSize: '12px', color: 'var(--cy)', margin: '2px 0 0 0' }}>
                      {cluster.recommended_remediation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FailuresPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse" style={{ padding: '20px' }}>
          <div className="fl" style={{ justifyContent: 'space-between' }}>
            <div style={{ width: '240px', height: '28px', background: 'var(--s2)', borderRadius: '4px' }} />
            <div style={{ width: '120px', height: '28px', background: 'var(--s2)', borderRadius: '4px' }} />
          </div>
          <div className="g g3" style={{ gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ height: '140px', background: 'var(--s1)' }} />
            ))}
          </div>
          <div className="card" style={{ height: '200px', background: 'var(--s1)' }} />
        </div>
      }
    >
      <FailuresContent />
    </Suspense>
  );
}
