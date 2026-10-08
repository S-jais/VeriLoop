'use client';

interface SubScore {
  label: string;
  weight: string;
  value: number | null;
  key: string;
}

interface EvaluationData {
  reliability_score?: number | null;
  task_success_score?: number | null;
  grounding_score?: number | null;
  tool_correctness_score?: number | null;
  policy_compliance_score?: number | null;
  safety_score?: number | null;
  context_handling_score?: number | null;
  critical_failures?: number;
}

interface ReliabilityScoreProps {
  evaluation: EvaluationData;
}

export function ReliabilityScore({ evaluation }: ReliabilityScoreProps) {
  const score = evaluation.reliability_score ?? 0;
  const scorePct = Math.round(score * 100);

  const subScores: SubScore[] = [
    { label: 'Task Success', weight: '30%', value: evaluation.task_success_score ?? null, key: 'task' },
    { label: 'Policy Compliance', weight: '20%', value: evaluation.policy_compliance_score ?? null, key: 'policy' },
    { label: 'Grounding & Faithfulness', weight: '20%', value: evaluation.grounding_score ?? null, key: 'grounding' },
    { label: 'Tool Correctness', weight: '15%', value: evaluation.tool_correctness_score ?? null, key: 'tool' },
    { label: 'Safety & Injection', weight: '10%', value: evaluation.safety_score ?? null, key: 'safety' },
    { label: 'Context Handling', weight: '5%', value: evaluation.context_handling_score ?? null, key: 'context' },
  ];

  const getScoreColor = (pct: number) => {
    if (pct >= 85) return '#10B981';
    if (pct >= 65) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="card space-y-4">
      <div className="fl" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="lbl">Composite Reliability Score</div>
          <div
            className="big mono"
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: scorePct >= 85 ? 'var(--gr)' : scorePct >= 65 ? 'var(--am)' : 'var(--rd)',
              marginTop: '2px',
            }}
          >
            {scorePct}%
          </div>
        </div>
        <div>
          {scorePct >= 70 ? (
            <span className="bd ok"><i></i>THRESHOLD MET</span>
          ) : (
            <span className="bd er"><i></i>UNRELIABLE</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {subScores.map((s) => {
          const val = s.value !== null ? Math.round(s.value * 100) : scorePct;
          const color = val >= 85 ? 'var(--gr)' : val >= 65 ? 'var(--am)' : 'var(--rd)';
          return (
            <div key={s.key} className="space-y-1">
              <div className="fl" style={{ justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="mu">
                  {s.label} <span style={{ opacity: 0.65 }}>({s.weight})</span>
                </span>
                <span className="mono font-semibold" style={{ color }}>
                  {val}%
                </span>
              </div>
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
                    width: `${val}%`,
                    background: color,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
