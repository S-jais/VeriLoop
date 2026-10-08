'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface RadarDataPoint {
  dimension: string;
  baseline: number;
  candidate?: number;
  fullMark: number;
}

interface ReliabilityRadarChartProps {
  scores: {
    task_success_score?: number | null;
    grounding_score?: number | null;
    tool_correctness_score?: number | null;
    policy_compliance_score?: number | null;
    safety_score?: number | null;
    context_handling_score?: number | null;
  };
  candidateScores?: {
    task_success_score?: number | null;
    grounding_score?: number | null;
    tool_correctness_score?: number | null;
    policy_compliance_score?: number | null;
    safety_score?: number | null;
    context_handling_score?: number | null;
  } | null;
  height?: number;
  showLegend?: boolean;
}

export function ReliabilityRadarChart({
  scores,
  candidateScores,
  height = 320,
  showLegend = true,
}: ReliabilityRadarChartProps) {
  const data: RadarDataPoint[] = [
    {
      dimension: 'Task Success',
      baseline: Math.round((scores.task_success_score ?? 0.8) * 100),
      candidate: candidateScores ? Math.round((candidateScores.task_success_score ?? 0.8) * 100) : undefined,
      fullMark: 100,
    },
    {
      dimension: 'Grounding',
      baseline: Math.round((scores.grounding_score ?? 0.7) * 100),
      candidate: candidateScores ? Math.round((candidateScores.grounding_score ?? 0.7) * 100) : undefined,
      fullMark: 100,
    },
    {
      dimension: 'Tool Correctness',
      baseline: Math.round((scores.tool_correctness_score ?? 0.85) * 100),
      candidate: candidateScores ? Math.round((candidateScores.tool_correctness_score ?? 0.85) * 100) : undefined,
      fullMark: 100,
    },
    {
      dimension: 'Policy Compliance',
      baseline: Math.round((scores.policy_compliance_score ?? 0.5) * 100),
      candidate: candidateScores ? Math.round((candidateScores.policy_compliance_score ?? 0.5) * 100) : undefined,
      fullMark: 100,
    },
    {
      dimension: 'Safety & Guardrails',
      baseline: Math.round((scores.safety_score ?? 0.6) * 100),
      candidate: candidateScores ? Math.round((candidateScores.safety_score ?? 0.6) * 100) : undefined,
      fullMark: 100,
    },
    {
      dimension: 'Context Handling',
      baseline: Math.round((scores.context_handling_score ?? 0.75) * 100),
      candidate: candidateScores ? Math.round((candidateScores.context_handling_score ?? 0.75) * 100) : undefined,
      fullMark: 100,
    },
  ];

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#1E293B" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#475569', fontSize: 10 }}
            stroke="#1E293B"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as RadarDataPoint;
                return (
                  <div
                    className="p-3 rounded-lg border text-xs shadow-xl backdrop-blur-md"
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      color: '#F8FAFC',
                    }}
                  >
                    <p className="font-semibold text-cyan-400 mb-1">{item.dimension}</p>
                    <p className="text-slate-300">
                      Baseline: <span className="font-mono text-slate-100">{item.baseline}%</span>
                    </p>
                    {item.candidate !== undefined && (
                      <p className="text-emerald-400 font-medium">
                        Candidate: <span className="font-mono">{item.candidate}%</span>
                        <span className="ml-1 text-xs">
                          ({item.candidate >= item.baseline ? '+' : ''}
                          {item.candidate - item.baseline}%)
                        </span>
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Radar
            name="Baseline Agent"
            dataKey="baseline"
            stroke="#64748B"
            fill="#64748B"
            fillOpacity={candidateScores ? 0.2 : 0.4}
            strokeWidth={1.5}
          />
          {candidateScores && (
            <Radar
              name="Candidate Agent"
              dataKey="candidate"
              stroke="#0DC7E5"
              fill="#0DC7E5"
              fillOpacity={0.4}
              strokeWidth={2}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
              formatter={(value) => (
                <span style={{ color: value === 'Candidate Agent' ? '#0DC7E5' : '#94A3B8' }}>
                  {value}
                </span>
              )}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
