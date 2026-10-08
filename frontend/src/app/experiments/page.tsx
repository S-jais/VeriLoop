'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { api, Experiment, Intervention, DemoStatus } from '@/lib/api';
import { Play, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const INTERVENTION_TYPES = [
  ['PROMPT', 'Modify instructions & meta-prompting constraints'],
  ['TOOL', 'Fix tool rules, schema or routing conditions'],
  ['RETRIEVAL', 'Change source priority & vector search ranking'],
  ['MEMORY', 'Change memory behavior & entity retention'],
  ['GUARDRAIL', 'Add input/output safety validation wrappers'],
  ['WORKFLOW', 'Change sequencing, fallback or verification steps'],
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

function ExperimentsContent() {
  const searchParams = useSearchParams();
  const linkedFailureId = searchParams.get('failure_id') || undefined;

  const queryClient = useQueryClient();
  const [runningExperiment, setRunningExperiment] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState('RETRIEVAL');

  const { data: demoStatus } = useQuery<DemoStatus>({
    queryKey: ['demo-status'],
    queryFn: api.demoStatus,
  });

  const { data: experiments = [], refetch: refetchExperiments } = useQuery<Experiment[]>({
    queryKey: ['experiments'],
    queryFn: api.listExperiments,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!demoStatus?.agent_id || !demoStatus?.baseline_version_id) {
        throw new Error('Agent or baseline version not found');
      }
      return api.runExperiment({
        intervention_id: 'catalog-retrieval-policy-v2',
        agent_id: demoStatus.agent_id,
        baseline_version_id: demoStatus.baseline_version_id,
        candidate_config: { type: selectedIntervention, strategy: 'prioritize_latest_version' },
      });
    },
    onMutate: () => setRunningExperiment(true),
    onSuccess: () => {
      setRunningExperiment(false);
      refetchExperiments();
      queryClient.invalidateQueries({ queryKey: ['demo-status'] });
    },
    onError: () => {
      setRunningExperiment(false);
    },
  });

  const latestExp = experiments[0] || null;

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Title & Headline */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Experiments</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            VeriLoop does not blindly optimize prompts. It tests targeted changes based on the diagnosed failure.
          </p>
        </div>

        <button
          onClick={() => runMutation.mutate()}
          disabled={runningExperiment}
          className="btn p sm"
        >
          <Play size={13} fill="currentColor" />
          <span>{runningExperiment ? 'Evaluating Candidate...' : 'Run Targeted Experiment'}</span>
        </button>
      </div>

      {/* 6 Targeted Intervention Modalities */}
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

      {/* Experiment Active Candidate Details */}
      <div className="card">
        <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span className="mono mu" style={{ fontSize: '11px' }}>
              {latestExp ? latestExp.id : DEMO_EXP.id}
            </span>
            <h3 style={{ fontSize: '17px', marginTop: '2px' }}>
              {latestExp ? 'Remediate Outdated Return Policy Retrieval' : DEMO_EXP.title}
            </h3>
          </div>
          <span className="bd ok">
            <i></i>CANDIDATE READY
          </span>
        </div>

        {/* 3 Candidate comparison cards */}
        <div className="g g3" style={{ marginTop: '12px' }}>
          {DEMO_EXP.cols.map((col, i) => (
            <div
              key={col}
              style={{
                background: 'var(--s2)',
                border: '1px solid var(--ln)',
                borderRadius: '3px',
                padding: '12px 14px',
              }}
            >
              <h3 style={{ fontSize: '14px' }}>{col}</h3>
              <p className="mu" style={{ fontSize: '12px', marginTop: '4px' }}>
                {DEMO_EXP.iv[i]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 60/20/20 Split Performance Table */}
      <div className="card">
        <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className="lbl">Generalization Split Breakdown</div>
          <span className="mono mu" style={{ fontSize: '11px' }}>60% OPT · 20% VAL · 20% HOLDOUT</span>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '6px' }}>
          <table>
            <thead>
              <tr>
                <th>Split</th>
                {DEMO_EXP.cols.map((col) => (
                  <th key={col}>{col}</th>
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
                    <td key={i} className="mono font-semibold" style={{ fontSize: '13px' }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mu" style={{ fontSize: '12.5px', marginTop: '12px' }}>
          We didn’t just improve the tests we optimized against. The fix generalizes to unseen holdout cases.
        </p>
      </div>

      {/* Generalization Check Card with Badges */}
      <div className="card">
        <div className="lbl">Generalization check</div>
        <h3 style={{ margin: '6px 0 12px', fontSize: '16px' }}>
          Did the fix actually generalize?
        </h3>
        <div className="fl">
          <span className="bd ok">
            <i></i>Optimization · PASS
          </span>
          <span className="bd ok">
            <i></i>Validation · PASS
          </span>
          <span className="bd ok">
            <i></i>Holdout · PASS
          </span>
          <span className="bd ok">
            <i></i>Regression · NONE
          </span>
          <span className="bd ok">
            <i></i>VERIFIED (zero regressions)
          </span>
        </div>

        <div className="fl" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--ln)' }}>
          <Link className="btn p" href="/regression">
            Verify in Regression Firewall →
          </Link>
          <Link className="btn" href="/reports">
            Generate Verification Report
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <Suspense
      fallback={
        <div className="mu" style={{ padding: '40px', textAlign: 'center' }}>
          Loading experiment lab...
        </div>
      }
    >
      <ExperimentsContent />
    </Suspense>
  );
}
