'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Agent } from '@/lib/api';
import { Play, Plus } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: api.listAgents,
  });

  const { data: demoStatus } = useQuery({
    queryKey: ['demo-status'],
    queryFn: api.demoStatus,
  });

  const eval_ = demoStatus?.latest_evaluation;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/agents', {
        name,
        description: description || 'Custom AI Agent registered for evaluation',
        adapter_type: 'demo_customer_support',
        is_demo: false,
      });
      setShowModal(false);
      setName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch {
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Agents</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Registered agent targets, architectural pipelines, and version lineage.
          </p>
        </div>

        <button className="btn sm" onClick={() => setShowModal(true)}>
          <Plus size={13} />
          <span>New agent</span>
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

      {/* Agent Card */}
      <div className="g g2">
        <div className="card g" style={{ gap: '14px' }}>
          <div className="fl">
            <h3 style={{ fontSize: '17px' }}>Customer Support Agent</h3>
            <span className="sp" />
            <span className={`bd ${eval_ ? (eval_.critical_failures === 0 ? 'ok' : 'er') : 'wn'}`}>
              <i></i>{eval_ ? (eval_.critical_failures === 0 ? 'VERIFIED' : 'NEEDS ATTENTION') : 'Not evaluated'}
            </span>
          </div>

          <p className="mu" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            Returns, replacements, refunds. Deterministic demo agent with intentional weaknesses in outdated policy retrieval.
          </p>

          <div className="g g2" style={{ gap: '10px' }}>
            <div>
              <span className="lbl">Version</span>
              <br />
              <b>v1.0 (baseline)</b>
            </div>
            <div>
              <span className="lbl">Model</span>
              <br />
              <b>NVIDIA Nemotron 70B</b>
            </div>
            <div>
              <span className="lbl">Reliability</span>
              <br />
              <b className={eval_?.reliability_score ? 'text-[var(--gr)]' : 'mu'}>
                {eval_?.reliability_score ? `${Math.round(eval_.reliability_score * 100)}%` : '—'}
              </b>
            </div>
            <div>
              <span className="lbl">Last evaluated</span>
              <br />
              <b>{eval_?.created_at ? new Date(eval_.created_at).toLocaleDateString() : 'Never'}</b>
            </div>
          </div>

          <div className="fl" style={{ marginTop: '4px' }}>
            <span className="bd in"><i></i>NEBIUS TOKEN FACTORY</span>
            <span className="bd in"><i></i>NVIDIA MODEL</span>
            <span className="bd in"><i></i>TAVILY</span>
          </div>

          <div className="fl" style={{ marginTop: '8px' }}>
            <Link className="btn sm" href="/">
              Dashboard
            </Link>
            <Link className="btn p sm" href="/">
              <Play size={11} fill="currentColor" />
              Evaluate
            </Link>
            <Link className="btn sm" href="/experiments">
              Versions
            </Link>
          </div>
        </div>
      </div>

      {/* Architecture & Model Details */}
      <div className="g g21">
        <div className="card">
          <h3>Architecture</h3>
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
          <h3>Inference Model</h3>
          <p className="mu" style={{ margin: '8px 0 12px', fontSize: '13px' }}>
            NVIDIA Llama-3.1-Nemotron-70B served via Nebius Token Factory.
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

      {/* Modal: Register Custom Agent */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ width: 'min(480px, 94vw)', background: 'var(--s1)', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px' }}>Register New Agent</h3>
            <form onSubmit={handleRegister} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              <div>
                <span className="lbl">Agent Name</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Booking Concierge Agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '3px',
                    border: '1px solid var(--ln)',
                    background: 'var(--s2)',
                    marginTop: '4px',
                  }}
                />
              </div>

              <div>
                <span className="lbl">Description</span>
                <input
                  type="text"
                  placeholder="e.g. Flight rebooking and itinerary assistant"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '3px',
                    border: '1px solid var(--ln)',
                    background: 'var(--s2)',
                    marginTop: '4px',
                  }}
                />
              </div>

              <div className="fl" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn sm" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn p sm">
                  {submitting ? 'Registering...' : 'Save Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
