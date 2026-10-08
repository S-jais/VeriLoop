'use client';

import { EvalProgressEvent } from '@/lib/api';
import { CheckCircle, Loader2, AlertTriangle, Clock } from 'lucide-react';

const STAGE_LABELS: Record<string, string> = {
  generating_tests: 'Generating tests',
  running_tests: 'Running agent tests',
  analyzing_failures: 'Analyzing failures',
  researching_evidence: 'Researching evidence',
  generating_interventions: 'Planning interventions',
  completed: 'Evaluation complete',
  error: 'Error occurred',
};

const STAGE_ORDER = [
  'generating_tests',
  'running_tests',
  'analyzing_failures',
  'researching_evidence',
  'generating_interventions',
  'completed',
];

interface Props {
  events: EvalProgressEvent[];
  currentProgress: number;
}

export function EvaluationProgress({ events, currentProgress }: Props) {
  // Determine which stages have been touched
  const touchedStages = new Set(events.map((e) => e.stage));
  const latestEvent = events[events.length - 1];
  const currentStage = latestEvent?.stage ?? '';

  return (
    <div className="card space-y-4">
      <div className="fl" style={{ justifyContent: 'space-between' }}>
        <div className="lbl">Live Autonomous Evaluation</div>
        <span className="bd in">
          <i></i>{currentStage === 'completed' ? 'COMPLETED' : 'RUNNING'}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          background: 'var(--s2)',
          border: '1px solid var(--ln)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${currentProgress}%`,
            background: 'var(--bl)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Stage steps */}
      <div className="space-y-2">
        {STAGE_ORDER.map((stage) => {
          const label = STAGE_LABELS[stage] ?? stage;
          const isDone = touchedStages.has(stage) && currentStage !== stage;
          const isActive = currentStage === stage;
          const isPending = !touchedStages.has(stage);
          const isError = stage === 'error' && currentStage === 'error';

          return (
            <div key={stage} className="fl" style={{ gap: '10px', fontSize: '12.5px' }}>
              <div style={{ flexShrink: 0, width: '16px', display: 'flex', alignItems: 'center' }}>
                {isError ? (
                  <AlertTriangle size={14} style={{ color: 'var(--rd)' }} />
                ) : isDone ? (
                  <CheckCircle size={14} style={{ color: 'var(--gr)' }} />
                ) : isActive ? (
                  <Loader2 size={14} className="animate-spin" style={{ color: 'var(--bl)' }} />
                ) : (
                  <Clock size={14} style={{ color: 'var(--mu)', opacity: 0.4 }} />
                )}
              </div>
              <span
                style={{
                  color: isActive
                    ? 'var(--tx)'
                    : isDone
                    ? 'var(--gr)'
                    : isPending
                    ? 'var(--mu)'
                    : 'var(--tx)',
                  fontWeight: isActive ? 600 : 400,
                  opacity: isPending ? 0.45 : 1,
                }}
              >
                {label}
              </span>
              {isActive && latestEvent && (
                <span className="mono mu" style={{ fontSize: '11px', marginLeft: 'auto' }}>
                  {latestEvent.message}
                </span>
              )}
              {isDone && stage === 'running_tests' && (
                <span className="mono font-bold" style={{ color: 'var(--gr)', fontSize: '11px', marginLeft: 'auto' }}>
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Latest message */}
      {latestEvent && currentStage !== 'completed' && currentStage !== 'error' && (
        <div
          className="mono mu"
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--ln)',
            fontSize: '11.5px',
          }}
        >
          {latestEvent.message}
        </div>
      )}
    </div>
  );
}
