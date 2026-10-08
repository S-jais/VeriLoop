'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, EvaluationRun, streamEvaluation } from '@/lib/api';
import { Play } from 'lucide-react';
import Link from 'next/link';

const STAGES = [
  'Generating tests',
  'Executing agent',
  'Evaluating responses',
  'Classifying failures',
  'Analyzing root causes',
  'Running interventions',
  'Validation',
  'Holdout verification',
  'Regression check',
  'Generating report',
];

export default function EvaluationsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [stagesState, setStagesState] = useState<Record<string, string>>({});

  const { data: evaluations = [], isLoading, refetch } = useQuery<EvaluationRun[]>({
    queryKey: ['evaluations'],
    queryFn: api.listEvaluations,
  });

  const { data: demoStatus } = useQuery({
    queryKey: ['demo-status'],
    queryFn: api.demoStatus,
  });

  const handleStartEvaluation = () => {
    if (!demoStatus?.agent_id || !demoStatus?.baseline_version_id) return;
    setIsRunning(true);
    setStagesState({ 'Generating tests': 'running' });

    streamEvaluation(
      demoStatus.agent_id,
      demoStatus.baseline_version_id,
      undefined,
      (event) => {
        if (event.stage) {
          setStagesState((prev) => ({
            ...prev,
            [event.stage]: 'running',
          }));
        }
        if (event.stage === 'completed' || event.stage === 'error') {
          setIsRunning(false);
          refetch();
        }
      },
      () => {
        setIsRunning(false);
      },
      () => {
        setIsRunning(false);
        refetch();
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Evaluations</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Autonomous multi-stage evaluation pipeline and rigorous holdout verification.
          </p>
        </div>

        <button
          onClick={handleStartEvaluation}
          disabled={isRunning}
          className="btn p sm"
        >
          <Play size={12} fill="currentColor" />
          <span>{isRunning ? 'Running pipeline...' : 'Run Evaluation'}</span>
        </button>
      </div>

      {/* Evaluation Design: 60/20/20 Split */}
      <div className="card">
        <h3>Evaluation design</h3>
        <div style={{ marginTop: '14px' }}>
          <div className="split">
            <div style={{ width: '60%', background: 'var(--bl)' }}>
              OPTIMIZATION 60%
            </div>
            <div style={{ width: '20%', background: 'var(--am)' }}>
              VALIDATION 20%
            </div>
            <div style={{ width: '20%', background: 'var(--gr)' }}>
              HOLDOUT 20%
            </div>
          </div>
          <p className="mu" style={{ fontSize: '12.5px', marginTop: '10px' }}>
            Holdout data never enters optimization. It is excluded before any intervention is generated.
          </p>
        </div>
      </div>

      {/* 10-Stage Pipeline Status (Active or Demo) */}
      <div className="card">
        <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3>Evaluation Pipeline Stages</h3>
          <span className="mono mu" style={{ fontSize: '11px' }}>
            {isRunning ? 'STREAMING REAL-TIME SSE' : 'PIPELINE READY'}
          </span>
        </div>

        <ul className="stg">
          {STAGES.map((stageName, idx) => {
            const status = stagesState[stageName] || (evaluations.length > 0 ? 'done' : 'idle');
            return (
              <li key={stageName} data-s={status}>
                <span className="d" />
                <span style={{ fontWeight: 500 }}>{stageName}</span>
                <span className="mono">
                  {status.toUpperCase()}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Evaluation History Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln)' }} className="fl">
          <h3>History</h3>
          <span className="sp" />
          <span className="mono mu" style={{ fontSize: '11px' }}>
            {evaluations.length} RECORDED RUNS
          </span>
        </div>

        {isLoading ? (
          <div className="mu" style={{ padding: '36px', textAlign: 'center', fontSize: '13px' }}>
            Loading evaluations...
          </div>
        ) : evaluations.length === 0 ? (
          <div className="empty" style={{ margin: '18px' }}>
            <b>No evaluations yet</b>
            <span>Run your first evaluation to see how your agent performs.</span>
            <button className="btn p sm" onClick={handleStartEvaluation}>
              Run Evaluation
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Run ID & Agent</th>
                <th>Status</th>
                <th>Breakdown</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => {
                const rel = ev.reliability_score !== null ? Math.round(ev.reliability_score * 100) : null;
                const isPassed = rel !== null && rel >= 70;
                return (
                  <tr key={ev.id}>
                    <td>
                      <span
                        className="mono font-bold"
                        style={{
                          fontSize: '17px',
                          color: isPassed ? 'var(--gr)' : 'var(--rd)',
                        }}
                      >
                        {rel !== null ? `${rel}%` : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>Customer Support Agent v1.0</div>
                      <div className="mono mu" style={{ fontSize: '11px', marginTop: '2px' }}>
                        {ev.id.slice(0, 16)} · {ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`bd ${isPassed ? 'ok' : 'er'}`}>
                        <i></i>{isPassed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="mono mu" style={{ fontSize: '12px' }}>
                      {ev.passed_tests}/{ev.total_tests} tests passed · {ev.critical_failures} critical
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
        )}
      </div>
    </div>
  );
}
