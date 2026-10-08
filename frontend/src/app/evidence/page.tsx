'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, EvidenceItem } from '@/lib/api';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function EvidencePage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [reason, setReason] = useState('');

  const { data: evidenceList = [], isLoading } = useQuery<EvidenceItem[]>({
    queryKey: ['evidence'],
    queryFn: () => api.listEvidence(),
  });

  const researchMutation = useMutation({
    mutationFn: (data: { query: string; reason: string }) => api.triggerResearch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      setSearchQuery('');
      setReason('');
    },
  });

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Evidence</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            External research and policy evidence, linked to the failure that needed it.
          </p>
        </div>

        <span className="bd in">
          <i></i>TAVILY RESEARCH ENGINE
        </span>
      </div>

      {/* Query Trigger Box */}
      <div className="card space-y-3">
        <div className="lbl">Query External Grounding Sources</div>
        <div className="g g2">
          <input
            type="text"
            placeholder="Search query (e.g. ShopEase current return policy 2024)"
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
            placeholder="Reason for research (e.g. Verify if return window is 90 days)"
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

        <div className="fl" style={{ justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            onClick={() =>
              searchQuery &&
              researchMutation.mutate({
                query: searchQuery,
                reason: reason || 'Grounded policy verification',
              })
            }
            disabled={!searchQuery || researchMutation.isPending}
            className="btn p sm"
          >
            <Search size={12} />
            <span>{researchMutation.isPending ? 'Querying Tavily...' : 'Execute Research Query'}</span>
          </button>
        </div>
      </div>

      {/* Evidence Cards or Empty State */}
      {evidenceList.length === 0 ? (
        <div className="empty">
          <b>Tavily evidence archive</b>
          <span>
            Evidence cards (query, source, summary, timestamp, reason, linked failure and test) appear here after research runs.
          </span>
          <button
            className="btn sm"
            onClick={() => {
              setSearchQuery('ShopEase return policy v3.4');
              setReason('Verify damaged laptop warranty replacement period');
            }}
          >
            Try sample query
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {evidenceList.map((item) => (
            <div key={item.id} className="card space-y-2">
              <div className="fl" style={{ justifyContent: 'space-between' }}>
                <span className="mono mu" style={{ fontSize: '11px' }}>
                  {item.source || item.source_title || item.source_url || 'Tavily AI'}
                </span>
                <span className="bd ok">
                  <i></i>VERIFIED SOURCE
                </span>
              </div>
              <h3 style={{ fontSize: '15px' }}>{item.query}</h3>
              <p className="mu" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                {item.summary || item.content_summary || 'Evidence summary'}
              </p>
              <div className="fl" style={{ paddingTop: '8px', borderTop: '1px solid var(--ln)', fontSize: '12px' }}>
                <span className="mu">Reason: {item.reason || item.reason_for_research || 'Verification'}</span>
                <span className="sp" />
                <span className="mono mu">
                  {(item.timestamp || item.retrieved_at) ? new Date(item.timestamp || item.retrieved_at || '').toLocaleString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
