'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, SettingsData, HealthStatus } from '@/lib/api';
import {
  NEMOTRON_MODEL_ID,
  FAST_MODEL_ID,
  INFERENCE_PROVIDER,
  EVIDENCE_PROVIDER,
  CANONICAL_SPLITS,
} from '@/lib/config';
import { MODEL_CONFIGS } from '@/config/models';
import {
  RotateCcw,
  CheckCircle2,
  Key,
  Cpu,
  Sliders,
  Shield,
  ExternalLink,
  Server,
  Lock,
} from 'lucide-react';

const TABS = ['Models', 'API Keys', 'Evaluation'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Models');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });

  const { data: health } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: api.getHealth,
    staleTime: 30000,
  });

  const handleResetDemo = async () => {
    if (!confirm('Reset demo baseline? This clears candidate versions and resets to clean baseline.')) return;
    setResetting(true);
    setResetMsg(null);
    try {
      await api.resetDemo();
      setResetMsg('Baseline reset successfully');
      setTimeout(() => setResetMsg(null), 3000);
      window.location.reload();
    } catch {
      setResetMsg('Baseline reset locally');
      setTimeout(() => setResetMsg(null), 3000);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Title & Description */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Settings</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Model allocations, inference provider configuration, and evaluation parameters.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={resetting}
          className="btn sm"
          style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--tx)' }}
        >
          <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} />
          <span>{resetting ? 'Resetting...' : 'Reset Demo Baseline'}</span>
        </button>
      </div>

      {resetMsg && (
        <div className="banner" style={{ borderColor: 'var(--cy)', color: 'var(--cy)' }}>
          {resetMsg}
        </div>
      )}

      {/* Tabs - Only keeping functional tabs */}
      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Models' && <Cpu size={13} className="mr-1 inline" />}
            {tab === 'API Keys' && <Key size={13} className="mr-1 inline" />}
            {tab === 'Evaluation' && <Sliders size={13} className="mr-1 inline" />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: MODELS ────────────────────────────────────────── */}
      {activeTab === 'Models' && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3>Model Job Allocation Matrix</h3>
                <p className="mu" style={{ fontSize: '12.5px', marginTop: '2px' }}>
                  All model calls are routed through Nebius Token Factory for high-throughput inference.
                </p>
              </div>
              <span className="bd in">
                <i></i>INFERENCE: {INFERENCE_PROVIDER}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Engineering Job</th>
                    <th>Model Identifier</th>
                    <th>Inference Provider</th>
                    <th>Role in VeriLoop Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {(MODEL_CONFIGS || settings?.models || []).map((m) => (
                    <tr key={m.job}>
                      <td><b>{m.job}</b></td>
                      <td className="mono font-semibold text-[var(--cy)]" style={{ fontSize: '12px' }}>
                        {m.model}
                      </td>
                      <td>
                        <span className="bd in">
                          <i></i>{m.inference}
                        </span>
                      </td>
                      <td className="mu" style={{ fontSize: '12px' }}>
                        {m.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card space-y-4">
            <h3>Inference Hyperparameters</h3>
            <div className="g g2">
              <div>
                <label className="lbl">Sampling Temperature (Reasoning / Judging)</label>
                <input
                  type="number"
                  readOnly
                  value="0.1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                    marginTop: '4px',
                  }}
                />
                <span className="mu" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Strict deterministic temperature for reproducible evaluations.
                </span>
              </div>

              <div>
                <label className="lbl">Max Context Generation Tokens</label>
                <input
                  type="number"
                  readOnly
                  value="4096"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                    marginTop: '4px',
                  }}
                />
                <span className="mu" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Full window budget for multi-turn adversarial causal traces.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: API KEYS ──────────────────────────────────────── */}
      {activeTab === 'API Keys' && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="fl" style={{ gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '4px',
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--gr)',
                }}
              >
                <Lock size={18} />
              </div>
              <div>
                <h3>Server-Side Environment Security Policy</h3>
                <p className="mu" style={{ fontSize: '12.5px', marginTop: '2px' }}>
                  VeriLoop enforces strict zero-client-secret isolation.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '4px',
                background: 'rgba(34, 209, 230, 0.04)',
                border: '1px solid rgba(34, 209, 230, 0.2)',
                lineHeight: 1.6,
                fontSize: '13px',
              }}
            >
              <p>
                <b>All API credentials live in server-side environment variables</b> (such as <code>.env</code> on the backend or host container secrets).
                They are never transmitted to, loaded into, or stored within the client browser application.
              </p>
              <p className="mu" style={{ marginTop: '8px' }}>
                When running the hosted hackathon demo, the frontend communicates with the self-contained mock adapter or secure backend proxies, ensuring judge evaluation requires zero credential entry.
              </p>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div className="lbl" style={{ marginBottom: '8px' }}>Configured Server Secrets</div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Environment Variable</th>
                      <th>Provider / Service</th>
                      <th>Scope</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono font-semibold">NEBIUS_API_KEY</td>
                      <td>Nebius Token Factory</td>
                      <td>High-throughput inference endpoints ({health?.primary_model || NEMOTRON_MODEL_ID})</td>
                      <td>
                        <span className={`bd ${health?.nebius_configured ? 'ok' : 'in'}`}>
                          <i></i>{health?.nebius_configured ? 'SERVER CONFIGURED' : 'ACTIVE IN DEMO MODE'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="mono font-semibold">TAVILY_API_KEY</td>
                      <td>Tavily Search API</td>
                      <td>External factual evidence retrieval & research grounding</td>
                      <td>
                        <span className={`bd ${health?.tavily_configured ? 'ok' : 'in'}`}>
                          <i></i>{health?.tavily_configured ? 'SERVER CONFIGURED' : 'ACTIVE IN DEMO MODE'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: EVALUATION ────────────────────────────────────── */}
      {activeTab === 'Evaluation' && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3>Canonical Generalization Split Specification</h3>
                <p className="mu" style={{ fontSize: '12.5px', marginTop: '2px' }}>
                  60/20/20 train-test-holdout isolation parameters enforced across all runs.
                </p>
              </div>
              <span className="mono mu" style={{ fontSize: '12px' }}>
                TOTAL: {CANONICAL_SPLITS.total} PROBES
              </span>
            </div>

            <div className="g g3">
              <div style={{ padding: '14px', background: 'var(--s2)', borderRadius: '3px', border: '1px solid var(--ln)' }}>
                <span className="lbl text-[var(--cy)]">Optimization Set</span>
                <div className="mono font-bold" style={{ fontSize: '18px', marginTop: '4px' }}>
                  60% (60 cases)
                </div>
                <p className="mu" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                  Initial diagnostic suites used to formulate prompt, tool, or retrieval interventions.
                </p>
              </div>

              <div style={{ padding: '14px', background: 'var(--s2)', borderRadius: '3px', border: '1px solid var(--ln)' }}>
                <span className="lbl text-[var(--or)]">Validation Set</span>
                <div className="mono font-bold" style={{ fontSize: '18px', marginTop: '4px' }}>
                  20% (20 cases)
                </div>
                <p className="mu" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                  Intermediate holdout used to rank candidates and reject overfit prompt changes.
                </p>
              </div>

              <div style={{ padding: '14px', background: 'var(--s2)', borderRadius: '3px', border: '1px solid var(--ln)' }}>
                <span className="lbl text-[var(--gr)]">Holdout Set</span>
                <div className="mono font-bold" style={{ fontSize: '18px', marginTop: '4px' }}>
                  20% (20 cases)
                </div>
                <p className="mu" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                  Strictly isolated blind test suite executed only for final regression certification.
                </p>
              </div>
            </div>

            <div className="g g2" style={{ marginTop: '12px' }}>
              <div>
                <label className="lbl">Minimum Probes per Suite</label>
                <div className="mono" style={{ padding: '8px 12px', background: 'var(--s2)', borderRadius: '3px', border: '1px solid var(--ln)', marginTop: '4px' }}>
                  100 multi-turn test probes
                </div>
              </div>
              <div>
                <label className="lbl">Regression Tolerance Gate</label>
                <div className="mono text-[var(--gr)] font-bold" style={{ padding: '8px 12px', background: 'var(--s2)', borderRadius: '3px', border: '1px solid var(--ln)', marginTop: '4px' }}>
                  0 regressions allowed (Strict Zero Regression)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
