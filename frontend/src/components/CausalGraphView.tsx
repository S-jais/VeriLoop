'use client';

import { CausalGraph, CausalNode } from '@/lib/api';
import { ArrowRight, AlertCircle, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

interface CausalGraphViewProps {
  graph?: CausalGraph | null;
  failureCategory?: string;
  confidence?: number | null;
}

export function CausalGraphView({ graph, failureCategory, confidence }: CausalGraphViewProps) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="card mu" style={{ fontSize: '12px' }}>
        No causal graph generated for this failure.
      </div>
    );
  }

  const getNodeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'input':
        return <AlertCircle size={13} style={{ color: 'var(--cy)' }} />;
      case 'root_cause':
        return <Cpu size={13} style={{ color: 'var(--rd)' }} />;
      case 'mechanism':
        return <ShieldAlert size={13} style={{ color: 'var(--am)' }} />;
      case 'failure':
        return <AlertCircle size={13} style={{ color: 'var(--rd)' }} />;
      default:
        return <Sparkles size={13} style={{ color: 'var(--bl)' }} />;
    }
  };

  const getNodeBadgeClass = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'root_cause':
      case 'failure':
        return 'bd er';
      case 'mechanism':
        return 'bd wn';
      case 'input':
        return 'bd in';
      default:
        return 'bd';
    }
  };

  return (
    <div className="card space-y-4" style={{ background: 'var(--s1)' }}>
      <div className="fl" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--ln)', paddingBottom: '12px' }}>
        <div className="fl" style={{ gap: '8px' }}>
          <span className="lbl">Diagnostic Causal Graph</span>
          {failureCategory && (
            <span className="bd">{failureCategory}</span>
          )}
        </div>
        {confidence && (
          <span className="mono font-bold" style={{ color: 'var(--gr)', fontSize: '12px' }}>
            {Math.round(confidence * 100)}% Confidence
          </span>
        )}
      </div>

      {graph.summary && (
        <p className="mu" style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
          {graph.summary}
        </p>
      )}

      {/* Visual Flow Pipeline */}
      <div className="fl" style={{ gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        {graph.nodes.map((node: CausalNode, index: number) => {
          return (
            <div key={node.id || index} className="fl" style={{ flex: '1 1 200px', minWidth: '180px', gap: '10px' }}>
              <div
                style={{
                  flex: 1,
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  borderRadius: '3px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div className="fl" style={{ justifyContent: 'space-between' }}>
                  <span className={getNodeBadgeClass(node.type)} style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                    {node.type?.replace('_', ' ').toUpperCase() || `NODE ${index + 1}`}
                  </span>
                  {getNodeIcon(node.type)}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tx)' }}>
                  {node.label}
                </div>
                <div className="mu" style={{ fontSize: '11.5px', lineHeight: 1.4 }}>
                  {node.detail}
                </div>
              </div>

              {index < graph.nodes.length - 1 && (
                <div className="fl" style={{ justifyContent: 'center', color: 'var(--mu)', opacity: 0.6 }}>
                  <ArrowRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

