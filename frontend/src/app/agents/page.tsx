'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Agent } from '@/lib/api';
import { Play, Plus, Bot, Globe, Upload, GitBranch, ShieldCheck, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';
import Link from 'next/link';
import AddAgentWizard from '@/components/AddAgentWizard';
import { NEMOTRON_MODEL_ID, INFERENCE_PROVIDER, CANONICAL_AGENT } from '@/lib/config';

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showWizard, setShowWizard] = useState(false);

  const { data: agents = [], isLoading, refetch } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: api.listAgents,
  });

  const { data: demoStatus } = useQuery({
    queryKey: ['demo-status'],
    queryFn: api.demoStatus,
  });

  const eval_ = demoStatus?.latest_evaluation;

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
            <h2>Agent Inventory</h2>
            <span className="mono mu" style={{ fontSize: '12px' }}>{agents.length} REGISTERED TARGETS</span>
          </div>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Registered agent targets, architectural pipelines, and version lineage.
          </p>
        </div>

        <button className="btn p sm" onClick={() => setShowWizard(true)}>
          <Plus size={13} />
          <span>Connect Agent</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        {['Overview', 'Versions', 'Tests', 'Failures', 'Traces', 'Configuration'].map((tab) => (
          <button
            key={tab}
            role="tab"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Agent Cards Grid */}
      <div className="g g2" style={{ gap: '16px' }}>
        {agents.map((ag) => {
          const isDemo = ag.is_demo || ag.id.includes('demo');
          const relScore = ag.reliability_score ? Math.round(ag.reliability_score <= 1.0 ? ag.reliability_score * 100 : ag.reliability_score) : 64;
          const isVerified = relScore >= 80 && (ag.critical_failures ?? 0) === 0;

          return (
            <div key={ag.id} className="card g" style={{ gap: '14px', background: 'var(--s1)' }}>
              <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="fl" style={{ gap: '6px', alignItems: 'center' }}>
                    <Bot size={16} className="text-[var(--cy)]" />
                    <h3 style={{ fontSize: '17px', margin: 0 }}>{ag.name}</h3>
                  </div>
                  <span className="mono mu" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    ID: {ag.id} · {ag.connection_type?.toUpperCase() || (isDemo ? 'DEMO' : 'API')}
                  </span>
                </div>
                <span className={`bd ${isVerified ? 'ok' : 'er'}`}>
                  <i></i>{isVerified ? 'VERIFIED' : 'NEEDS ATTENTION'}
                </span>
              </div>

              <p className="mu" style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                {ag.description || 'Autonomous agent target evaluated under VeriLoop reliability protocol.'}
              </p>

              <div className="g g2" style={{ gap: '10px' }}>
                <div>
                  <span className="lbl">Framework</span>
                  <br />
                  <b>{ag.framework || 'LangGraph'}</b>
                </div>
                <div>
                  <span className="lbl">Current Version</span>
                  <br />
                  <b>{ag.current_version || 'v1.0 (baseline)'}</b>
                </div>
                <div>
                  <span className="lbl">Reliability Index</span>
                  <br />
                  <b className={isVerified ? 'text-[var(--gr)]' : 'text-[var(--rd)]'}>
                    {relScore}% / 100
                  </b>
                </div>
                <div>
                  <span className="lbl">Audit Status</span>
                  <br />
                  <b>{ag.last_evaluation_status?.toUpperCase() || 'COMPLETED'}</b>
                </div>
              </div>

              <div className="fl" style={{ gap: '6px', flexWrap: 'wrap' }}>
                <span className="bd in"><i></i>{INFERENCE_PROVIDER.toUpperCase()}</span>
                <span className="bd in"><i></i>NVIDIA NEMOTRON</span>
                {isDemo && <span className="bd in" style={{ borderColor: 'var(--am)', color: 'var(--am)' }}>DEMO AGENT</span>}
                {ag.endpoint_url && <span className="mono mu" style={{ fontSize: '11px' }}>{ag.endpoint_url}</span>}
              </div>

              <div className="fl" style={{ gap: '8px', marginTop: '6px' }}>
                <Link className="btn sm" href="/dashboard">
                  Dashboard
                </Link>
                <Link className="btn p sm" href="/evaluations">
                  <Play size={11} fill="currentColor" />
                  Evaluate
                </Link>
                <Link className="btn sm" href="/experiments">
                  Experiments
                </Link>
                <Link className="btn sm" href="/reports">
                  Report
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture & Model Details */}
      <div className="g g21">
        <div className="card">
          <h3>Verification Architecture</h3>
          <div className="flow" style={{ marginTop: '12px' }}>
            <span>User</span>
            <i>→</i>
            <span>Agent</span>
            <i>→</i>
            <span>Retriever</span>
            <i>→</i>
            <span>Tools</span>
            <i>→</i>
            <span>Response</span>
          </div>
        </div>

        <div className="card">
          <h3>Inference Provider</h3>
          <p className="mu" style={{ margin: '8px 0 12px', fontSize: '13px' }}>
            {NEMOTRON_MODEL_ID} served via {INFERENCE_PROVIDER}.
          </p>
          <div className="fl">
            <span className="bd ok"><i></i>ONLINE</span>
            <span className="bd in"><i></i>REASONING ENGINE</span>
          </div>
        </div>
      </div>

      {/* Version Lifecycle Flow */}
      <div className="card">
        <h3>Version lifecycle</h3>
        <div className="flow" style={{ marginTop: '12px' }}>
          <span>v1.0 baseline</span>
          <i>→</i>
          <span>candidate</span>
          <i>→</i>
          <span>validate + holdout</span>
          <i>→</i>
          <span className="f">VERIFIED</span>
          <i>or</i>
          <span style={{ color: 'var(--rd)' }}>DISCARDED</span>
        </div>
      </div>

      {/* Add Agent Wizard Modal */}
      <AddAgentWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onAgentAdded={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['agents'] });
        }}
      />
    </div>
  );
}
