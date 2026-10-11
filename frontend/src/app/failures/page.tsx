'use client';

import React, { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, Failure } from '@/lib/api';
import Link from 'next/link';
import { Bug, ArrowRight, Copy, Check, Search, ShieldAlert, Sparkles, Filter } from 'lucide-react';

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
  const failureIdParam = searchParams.get('id');

  const [selectedNode, setSelectedNode] = useState(3);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { data: backendFailures = [] } = useQuery<Failure[]>({
    queryKey: ['failures'],
    queryFn: () => api.listFailures(),
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

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Title & Headline */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Diagnosed Failures</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Autonomous causal graph attribution, root-cause isolation, and multi-turn execution traces.
          </p>
        </div>

        <div className="fl">
          <span className="bd er">
            <i></i>{allFailures.filter((f) => f.sev === 'CRITICAL').length} CRITICAL
          </span>
          <span className="bd or">
            <i></i>{allFailures.filter((f) => f.sev === 'HIGH').length} HIGH
          </span>
        </div>
      </div>

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

      {/* Failure Selector Drawer / Carousel */}
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
                background: isSelected
                  ? 'rgba(34, 209, 230, 0.08)'
                  : undefined,
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
            <Link
              className="btn p sm whitespace-nowrap"
              href={`/experiments?failure_id=${activeFailure.id}`}
            >
              <Sparkles size={13} />
              <span>Test Targeted Intervention</span>
            </Link>
            <Link className="btn sm whitespace-nowrap" href="/evidence">
              <Search size={13} />
              <span>Grounding Evidence</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Vertical Causal Graph & Node Detail Inspector */}
      <div className="g g21" style={{ alignItems: 'flex-start' }}>
        {/* Interactive Causal Chain */}
        <div className="card">
          <div className="lbl" style={{ marginBottom: '12px' }}>
            Attributed Causal Failure Chain
          </div>
          <div className="gr">
            {nodes.map((node, i) => (
              <React.Fragment key={i}>
                <button
                  className="nd"
                  aria-pressed={i === selectedNode}
                  onClick={() => setSelectedNode(i)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderColor: i === selectedNode ? 'var(--cy)' : undefined,
                    background: i === selectedNode ? 'rgba(34, 209, 230, 0.12)' : undefined,
                  }}
                >
                  <span className="lbl">{node[0]}</span>
                  <small style={{ color: 'var(--tx)', marginTop: '4px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node[1].split('\n')[0]}
                  </small>
                </button>
                {i < nodes.length - 1 && <div className="ar" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Selected Node Inspector */}
        <div className="card" style={{ minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
          <div className="fl" style={{ justifyContent: 'space-between' }}>
            <span className="lbl text-[var(--cy)]">Stage Node: {nodes[selectedNode][0]}</span>
            <span className="mono mu" style={{ fontSize: '11px' }}>Node 0{selectedNode + 1} of 05</span>
          </div>
          <p
            style={{
              margin: '14px 0',
              whiteSpace: 'pre-line',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
            className={selectedNode === 3 ? 'text-[var(--am)] font-medium' : selectedNode === 4 ? 'mono text-[var(--cy)]' : ''}
          >
            {nodes[selectedNode][1]}
          </p>
          <p className="mu" style={{ fontSize: '12px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--ln)' }}>
            Grounded hypothesis generated by {NEMOTRON_MODEL_ID} ({INFERENCE_PROVIDER}) causal graph attribution.
          </p>
        </div>
      </div>

      {/* Execution Trace Accordion */}
      <div className="card">
        <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3>Multi-Turn Execution Trace</h3>
          <span className="mono mu" style={{ fontSize: '11px' }}>
            {activeFailure.trace.length} AUDIT STEPS LOGGED
          </span>
        </div>

        <div style={{ marginTop: '8px' }}>
          {activeFailure.trace.map((step: any, idx: number) => (
            <details key={idx} open={idx === 0 || idx === activeFailure.trace.length - 1}>
              <summary style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="mono mu" style={{ fontSize: '11.5px', minWidth: '24px' }}>
                  0{idx + 1}
                </span>
                <b>{step[0]}</b>
              </summary>
              <div style={{ padding: '8px 14px 12px' }}>
                <pre style={{ margin: 0, padding: '12px', background: 'rgba(5, 10, 14, 0.6)', borderRadius: '3px', fontSize: '12.5px' }}>
                  {step[1]}
                </pre>
                <button
                  className="btn sm"
                  onClick={() => handleCopy(step[1], idx)}
                  style={{ marginTop: '8px', fontSize: '11.5px' }}
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check size={12} className="text-[var(--gr)]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy Step
                    </>
                  )}
                </button>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FailuresPage() {
  return (
    <Suspense
      fallback={
        <div className="mu" style={{ padding: '40px', textAlign: 'center' }}>
          Loading failure analysis...
        </div>
      }
    >
      <FailuresContent />
    </Suspense>
  );
}
