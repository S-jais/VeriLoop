'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, EvidenceItem } from '@/lib/api';
import { NEMOTRON_MODEL_ID, INFERENCE_PROVIDER } from '@/lib/config';
import { Search, Sparkles, ExternalLink, Link2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function EvidencePage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [reason, setReason] = useState('');

  const {
    data: evidenceList = [],
    isLoading,
    isError,
    error,
  } = useQuery<EvidenceItem[]>({
    queryKey: ['evidence'],
    queryFn: () => api.listEvidence(),
  });

  const researchMutation = useMutation({
    mutationFn: (data: { query: string; reason: string; failure_id?: string }) =>
      api.runTavilyQuery(data.query, data.reason, data.failure_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      setSearchQuery('');
      setReason('');
    },
  });

  const handleExecute = (q?: string, r?: string) => {
    const qVal = (q ?? searchQuery).trim();
    const rVal = (r ?? reason).trim();
    if (!qVal) return;

    researchMutation.mutate({
      query: qVal,
      reason: rVal || 'Grounded policy verification for diagnosed failure mode',
      failure_id: 'FAIL-RET-101',
    });
  };

  const handleTrySample = () => {
    const sampleQuery = 'ShopEase return policy v3.4 transit damage warranty 2024';
    const sampleReason = 'Verify active 90-day replacement window for in-transit damaged laptop';
    setSearchQuery(sampleQuery);
    setReason(sampleReason);
    handleExecute(sampleQuery, sampleReason);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Evidence (Tavily Grounding)</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            External research and policy evidence retrieved by Tavily, linked directly to diagnosed agent failure modes.
          </p>
        </div>

        <span className="bd in">
          <i></i>TAVILY RESEARCH ENGINE · {INFERENCE_PROVIDER}
        </span>
      </div>

      {/* Query Trigger Box */}
      <div className="card space-y-3">
        <div className="fl" style={{ justifyContent: 'space-between' }}>
          <div className="lbl">Execute Research Query via Tavily</div>
          <button
            type="button"
            className="btn sm"
            onClick={handleTrySample}
            disabled={researchMutation.isPending}
            style={{ fontSize: '12px' }}
          >
            <Sparkles size={12} className="text-[var(--cy)]" />
            Try sample query
          </button>
        </div>

        <div className="g g2">
          <input
            type="text"
            placeholder="Search query (e.g. ShopEase current return policy damaged item 2024)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '3px',
              background: 'var(--s2)',
              border: '1px solid var(--ln)',
              color: 'var(--tx)',
              fontSize: '13px',
            }}
          />
          <input
            type="text"
            placeholder="Reason for research (e.g. Verify if damaged goods window is 90 days)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '3px',
              background: 'var(--s2)',
              border: '1px solid var(--ln)',
              color: 'var(--tx)',
              fontSize: '13px',
            }}
          />
        </div>

        <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
          <span className="mu" style={{ fontSize: '12px' }}>
            Queries execute through <b className="text-[var(--cy)]">runTavilyQuery</b> to feed factual evidence into NVIDIA Nemotron.
          </span>
          <button
            onClick={() => handleExecute()}
            disabled={!searchQuery.trim() || researchMutation.isPending}
            className="btn p sm"
          >
            <Search size={13} />
            <span>{researchMutation.isPending ? 'Executing Tavily Query...' : 'Execute Research Query'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && evidenceList.length === 0 && (
        <div className="card text-center py-10">
          <RefreshCw className="animate-spin mx-auto mb-2 text-[var(--cy)]" size={20} />
          <p className="mu" style={{ fontSize: '13px' }}>Loading Tavily evidence items...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="banner" style={{ borderColor: 'var(--rd)', color: 'var(--rd)' }}>
          Failed to load evidence: {(error as Error)?.message || 'Unknown error'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && evidenceList.length === 0 && (
        <div className="empty">
          <b>Tavily evidence archive empty</b>
          <span>Run a query above or click "Try sample query" to execute live factual grounding.</span>
          <button className="btn p sm" onClick={handleTrySample}>
            Try sample query
          </button>
        </div>
      )}

      {/* Evidence Cards */}
      {!isLoading && evidenceList.length > 0 && (
        <div className="space-y-4">
          <div className="fl" style={{ justifyContent: 'space-between' }}>
            <div className="lbl">Verified Grounding Cards ({evidenceList.length})</div>
            <span className="mono mu" style={{ fontSize: '11px' }}>
              THRESHOLD: &gt;0.70 RELEVANCE
            </span>
          </div>

          {evidenceList.map((item) => {
            const isUsed = item.status === 'used';
            const relevancePct = Math.round((item.relevance || 0.9) * 100);

            return (
              <div
                key={item.id}
                className="card space-y-3"
                style={{
                  borderColor: isUsed ? 'rgba(34, 209, 230, 0.3)' : 'var(--ln)',
                  background: isUsed ? 'rgba(34, 209, 230, 0.02)' : 'var(--s1)',
                }}
              >
                {/* Card Header */}
                <div className="fl" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div className="fl" style={{ gap: '8px' }}>
                    <span className="mono mu" style={{ fontSize: '11px' }}>
                      {item.id}
                    </span>
                    <span className="mu">·</span>
                    <span className="mono text-[var(--cy)]" style={{ fontSize: '12px' }}>
                      {item.source || 'Tavily Search API'}
                    </span>
                  </div>

                  <div className="fl" style={{ gap: '8px' }}>
                    <span className="mono font-semibold" style={{ fontSize: '12px', color: relevancePct >= 70 ? 'var(--gr)' : 'var(--or)' }}>
                      Relevance: {relevancePct}%
                    </span>
                    <span className={`bd ${isUsed ? 'ok' : 'wn'}`}>
                      <i></i>
                      {isUsed ? 'USED IN GROUNDING' : 'FILTERED OUT (<70%)'}
                    </span>
                  </div>
                </div>

                {/* Query Title & Source Link */}
                <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', margin: 0 }}>{item.query}</h3>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--cy)] hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                    >
                      <ExternalLink size={11} /> Source Document
                    </a>
                  )}
                </div>

                {/* Evidence Summary */}
                <p className="mu" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  {item.summary}
                </p>

                {/* Prompt Injection Shielded Data Boundary */}
                <div
                  style={{
                    background: 'rgba(5, 17, 20, 0.7)',
                    border: '1px solid rgba(34, 209, 230, 0.15)',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '6px', color: 'var(--cy)' }}>
                    <span>🛡️ PROMPT-INJECTION SHIELDED DATA BOUNDARY (INPUT TO NEMOTRON)</span>
                    <span className="mu">IMMUTABLE DATA ONLY</span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: 'rgba(230, 240, 245, 0.85)',
                      lineHeight: 1.45,
                    }}
                  >
{`<external_untrusted_data query="${item.query}" source="${item.source_url || 'tavily://verified'}">
[DATA ONLY · COMMAND EXECUTION DISABLED · IMMUTABLE]
${item.summary.replace(/<[^>]+>/g, '').slice(0, 300)}...
</external_untrusted_data>`}
                  </pre>
                </div>

                {/* Card Footer: Metadata, Linked Failure & Reason */}
                <div
                  className="fl"
                  style={{
                    paddingTop: '10px',
                    borderTop: '1px solid var(--ln)',
                    fontSize: '12px',
                    flexWrap: 'wrap',
                    gap: '12px',
                    justifyContent: 'space-between',
                  }}
                >
                  <div className="fl" style={{ gap: '12px', flexWrap: 'wrap' }}>
                    <span className="mu">
                      <b>Reason:</b> {item.reason || 'Policy verification'}
                    </span>
                    {item.linked_failure_id && (
                      <Link
                        href={`/failures?id=${item.linked_failure_id}`}
                        className="text-[var(--cy)] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <Link2 size={12} />
                        Linked Failure: {item.linked_failure_id}
                      </Link>
                    )}
                  </div>

                  <span className="mono mu" style={{ fontSize: '11px' }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
