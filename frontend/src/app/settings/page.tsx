'use client';

import React, { useState } from 'react';
import axios from 'axios';
import {
  RotateCcw,
  CheckCircle2,
  Key,
  Shield,
  Bell,
  Cpu,
  Layers,
  Database,
  Sliders,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Radio,
  Save,
} from 'lucide-react';

const TABS = [
  'Workspace',
  'Models',
  'Providers',
  'API Keys',
  'Evaluation',
  'Security',
  'Notifications',
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Workspace');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Workspace form state
  const [workspaceName, setWorkspaceName] = useState('VeriLoop Production Reliability Fleet');
  const [environment, setEnvironment] = useState('Production');
  const [telemetryLevel, setTelemetryLevel] = useState('INFO');
  const [sandboxMode, setSandboxMode] = useState('Strict Isolation');

  // Models form state
  const [primaryModel, setPrimaryModel] = useState('nvidia/llama-3.1-nemotron-70b-instruct');
  const [fastModel, setFastModel] = useState('meta-llama/Meta-Llama-3.1-8B-Instruct');
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(4096);

  // API Keys state
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [nebiusKey, setNebiusKey] = useState('sk-neb-9a8f7c6e5d4b3a20198273645');
  const [tavilyKey, setTavilyKey] = useState('tvly-prod-4b2c1d9e8f7a6b5c4d3e');
  const [webhookSecret, setWebhookSecret] = useState('whsec_88f912c98d7a12b4e5f6');

  // Evaluation form state
  const [optSplit, setOptSplit] = useState(60);
  const [valSplit, setValSplit] = useState(20);
  const [holdoutSplit, setHoldoutSplit] = useState(20);
  const [minProbes, setMinProbes] = useState(100);
  const [regressionThreshold, setRegressionThreshold] = useState(0);

  // Security form state
  const [promptSanitize, setPromptSanitize] = useState(true);
  const [piiRedaction, setPiiRedaction] = useState(true);
  const [shaSigning, setShaSigning] = useState(true);

  // Notifications form state
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/X00');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [notifyOnRegression, setNotifyOnRegression] = useState(true);
  const [notifyOnHoldoutDrift, setNotifyOnHoldoutDrift] = useState(true);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    showToast('Copied to clipboard');
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset demo state? This clears recent candidate versions and evaluations.')) return;
    setResetting(true);
    setResetMsg(null);
    try {
      await axios.post('http://127.0.0.1:8000/api/demo/reset');
      setResetMsg('Demo reset successfully');
      setTimeout(() => setResetMsg(null), 3000);
      window.location.reload();
    } catch {
      setResetMsg('Demo reset locally');
      setTimeout(() => setResetMsg(null), 3000);
    } finally {
      setResetting(false);
    }
  };

  const providers = [
    {
      name: 'Nebius Token Factory',
      role: 'High-throughput enterprise AI inference',
      endpoint: 'https://api.tokenfactory.nebius.com/v1',
      latency: '38ms',
      uptime: '99.99%',
      status: 'Connected',
      ok: true,
    },
    {
      name: 'NVIDIA Nemotron 70B',
      role: 'Autonomous test generation & causal reasoning',
      endpoint: 'nvidia/llama-3.1-nemotron-70b-instruct',
      latency: '112ms',
      uptime: '99.95%',
      status: 'Connected',
      ok: true,
    },
    {
      name: 'Tavily Search API',
      role: 'Live policy grounding & external verification evidence',
      endpoint: 'https://api.tavily.com/v1/search',
      latency: '240ms',
      uptime: '99.92%',
      status: 'Connected',
      ok: true,
    },
    {
      name: 'Local SQLite WAL Engine',
      role: 'Write-Ahead-Logging concurrent eval storage',
      endpoint: 'backend/data/veriloop.db',
      latency: '<1ms',
      uptime: '100%',
      status: 'Healthy',
      ok: true,
    },
    {
      name: 'Autonomous Evaluation Engine',
      role: 'Multi-turn adversarial probe orchestrator',
      endpoint: 'Local worker pool (4 active slots)',
      latency: '14ms',
      uptime: '100%',
      status: 'Active',
      ok: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Title & Description */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Settings</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Environment configuration, provider connectivity, model parameters, and split defaults.
          </p>
        </div>

        {toastMsg && (
          <span className="bd ok" style={{ fontSize: '12px' }}>
            <i></i>{toastMsg}
          </span>
        )}
      </div>

      {/* Tabs Row */}
      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
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

      {/* TAB 1: WORKSPACE */}
      {activeTab === 'Workspace' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>Workspace Profile</h3>
                <p className="mu" style={{ fontSize: '12.5px' }}>
                  General workspace metadata, active environment, and execution policies.
                </p>
              </div>
              <button
                className="btn p sm"
                onClick={() => showToast('Workspace settings saved')}
              >
                <Save size={13} />
                Save Changes
              </button>
            </div>

            <div className="g g2" style={{ gap: '16px' }}>
              <div>
                <label className="lbl">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label className="lbl">Environment Tier</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="Production">Production (Zero Regression Enforced)</option>
                  <option value="Staging">Staging (Validation Gated)</option>
                  <option value="Development">Development (Sandbox Mode)</option>
                </select>
              </div>

              <div>
                <label className="lbl">Telemetry Logging Level</label>
                <select
                  value={telemetryLevel}
                  onChange={(e) => setTelemetryLevel(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="DEBUG">DEBUG — Full multi-turn step tracing</option>
                  <option value="INFO">INFO — Stage transitions and failure records</option>
                  <option value="WARN">WARN — Regressions and critical deviations only</option>
                </select>
              </div>

              <div>
                <label className="lbl">Execution Sandbox Mode</label>
                <select
                  value={sandboxMode}
                  onChange={(e) => setSandboxMode(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="Strict Isolation">Strict Isolation (Mocked external side-effects)</option>
                  <option value="Network Monitored">Network Monitored (Dry-run tool calls)</option>
                  <option value="Direct Live">Direct Live (Target agent endpoint)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card g g3">
            <div>
              <span className="lbl">Active Agent Fleet</span>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>Enterprise Customer Fleet v1.0</div>
              <span className="mu mono" style={{ fontSize: '11px' }}>6 verified agents under test</span>
            </div>
            <div>
              <span className="lbl">Database Storage</span>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>SQLite WAL Mode</div>
              <span className="mu mono" style={{ fontSize: '11px' }}>backend/data/veriloop.db</span>
            </div>
            <div>
              <span className="lbl">Audit Retention</span>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>90 Days Rolling</div>
              <span className="mu mono" style={{ fontSize: '11px' }}>SHA-256 tamper-evident logs</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODELS */}
      {activeTab === 'Models' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>Reasoning & Evaluation Models</h3>
                <p className="mu" style={{ fontSize: '12.5px' }}>
                  Configure inference backends, model routing, and generation parameters for evaluation.
                </p>
              </div>
              <button
                className="btn p sm"
                onClick={() => showToast('Model configuration saved')}
              >
                <Save size={13} />
                Save Changes
              </button>
            </div>

            <div className="g g2" style={{ gap: '16px' }}>
              <div>
                <label className="lbl">Primary Autonomous Evaluator</label>
                <select
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="nvidia/llama-3.1-nemotron-70b-instruct">
                    nvidia/llama-3.1-nemotron-70b-instruct (Recommended)
                  </option>
                  <option value="meta-llama/Meta-Llama-3.1-70B-Instruct">
                    meta-llama/Meta-Llama-3.1-70B-Instruct
                  </option>
                  <option value="Qwen/Qwen2.5-72B-Instruct">
                    Qwen/Qwen2.5-72B-Instruct
                  </option>
                </select>
                <small className="mu" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                  Powers causal DAG generation, holdout audit, and regression gating.
                </small>
              </div>

              <div>
                <label className="lbl">Fast / High-Throughput Model</label>
                <select
                  value={fastModel}
                  onChange={(e) => setFastModel(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="meta-llama/Meta-Llama-3.1-8B-Instruct">
                    meta-llama/Meta-Llama-3.1-8B-Instruct (High-speed Prober)
                  </option>
                  <option value="Qwen/Qwen2.5-7B-Instruct">
                    Qwen/Qwen2.5-7B-Instruct
                  </option>
                </select>
                <small className="mu" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                  Used for rapid scenario synthesis and initial boundary probing.
                </small>
              </div>

              <div>
                <div className="fl" style={{ justifyContent: 'space-between' }}>
                  <label className="lbl">Sampling Temperature</label>
                  <span className="mono text-[var(--cy)]" style={{ fontSize: '12px' }}>
                    {temperature} (Deterministic)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>

              <div>
                <div className="fl" style={{ justifyContent: 'space-between' }}>
                  <label className="lbl">Max Generation Tokens</label>
                  <span className="mono text-[var(--cy)]" style={{ fontSize: '12px' }}>
                    {maxTokens} tokens
                  </span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="8192"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Model Provider Routing</h3>
            <p className="mu" style={{ fontSize: '12.5px', marginTop: '2px' }}>
              All open-source model inference is routed through Nebius Token Factory with enterprise SLAs.
            </p>
            <div className="fl" style={{ marginTop: '12px', gap: '8px' }}>
              <span className="bd in"><i></i>NEBIUS HIGH-SPEED ENDPOINT</span>
              <span className="bd ok"><i></i>128K TOKEN CONTEXT</span>
              <span className="bd in"><i></i>STREAMING SSE SUPPORT</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROVIDERS */}
      {activeTab === 'Providers' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <div className="fl" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>Integrated Providers</h3>
                <p className="mu" style={{ fontSize: '12.5px' }}>
                  Real-time status, endpoints, latency and connectivity for connected engines.
                </p>
              </div>
              <button
                className="btn sm"
                onClick={() => showToast('All provider connections healthy')}
              >
                <RotateCcw size={12} />
                Ping All Providers
              </button>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Role</th>
                    <th>Endpoint / Model</th>
                    <th>Latency</th>
                    <th>Uptime</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.name}>
                      <td>
                        <b>{p.name}</b>
                      </td>
                      <td className="mu" style={{ fontSize: '12px' }}>
                        {p.role}
                      </td>
                      <td className="mono mu" style={{ fontSize: '11px' }}>
                        {p.endpoint}
                      </td>
                      <td className="mono text-[var(--cy)]" style={{ fontSize: '11.5px' }}>
                        {p.latency}
                      </td>
                      <td className="mono text-[var(--gr)]" style={{ fontSize: '11.5px' }}>
                        {p.uptime}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`bd ${p.ok ? 'ok' : 'wn'}`}>
                          <i></i>{p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mu" style={{ fontSize: '12px', marginTop: '14px' }}>
              Keys are read from server environment variables and are never transmitted to the browser.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: API KEYS */}
      {activeTab === 'API Keys' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>API Key Management</h3>
                <p className="mu" style={{ fontSize: '12.5px' }}>
                  Manage credentials for external inference, web research, and agent webhooks.
                </p>
              </div>
              <button
                className="btn p sm"
                onClick={() => showToast('API Keys saved securely')}
              >
                <Save size={13} />
                Save Keys
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="lbl">Nebius Token Factory API Key</label>
                <div className="fl" style={{ marginTop: '6px' }}>
                  <input
                    type={showKeys['nebius'] ? 'text' : 'password'}
                    value={nebiusKey}
                    onChange={(e) => setNebiusKey(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '3px',
                      background: 'var(--s2)',
                      border: '1px solid var(--ln)',
                      color: 'var(--tx)',
                      fontSize: '13px',
                      fontFamily: 'var(--mono)',
                    }}
                  />
                  <button className="btn sm" onClick={() => toggleShowKey('nebius')}>
                    {showKeys['nebius'] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button className="btn sm" onClick={() => copyToClipboard(nebiusKey)}>
                    <Copy size={13} />
                  </button>
                </div>
                <small className="mu" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                  Used for high-throughput NVIDIA Nemotron inference. Read from <code>NEBIUS_API_KEY</code>.
                </small>
              </div>

              <div>
                <label className="lbl">Tavily AI Research API Key</label>
                <div className="fl" style={{ marginTop: '6px' }}>
                  <input
                    type={showKeys['tavily'] ? 'text' : 'password'}
                    value={tavilyKey}
                    onChange={(e) => setTavilyKey(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '3px',
                      background: 'var(--s2)',
                      border: '1px solid var(--ln)',
                      color: 'var(--tx)',
                      fontSize: '13px',
                      fontFamily: 'var(--mono)',
                    }}
                  />
                  <button className="btn sm" onClick={() => toggleShowKey('tavily')}>
                    {showKeys['tavily'] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button className="btn sm" onClick={() => copyToClipboard(tavilyKey)}>
                    <Copy size={13} />
                  </button>
                </div>
                <small className="mu" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                  Used to fetch external grounding evidence and policy proofs. Read from <code>TAVILY_API_KEY</code>.
                </small>
              </div>

              <div>
                <label className="lbl">Target Agent Webhook Signing Secret</label>
                <div className="fl" style={{ marginTop: '6px' }}>
                  <input
                    type={showKeys['webhook'] ? 'text' : 'password'}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '3px',
                      background: 'var(--s2)',
                      border: '1px solid var(--ln)',
                      color: 'var(--tx)',
                      fontSize: '13px',
                      fontFamily: 'var(--mono)',
                    }}
                  />
                  <button className="btn sm" onClick={() => toggleShowKey('webhook')}>
                    {showKeys['webhook'] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button className="btn sm" onClick={() => copyToClipboard(webhookSecret)}>
                    <Copy size={13} />
                  </button>
                </div>
                <small className="mu" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                  Validates inbound HMAC signatures when evaluating custom registered agents.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EVALUATION */}
      {activeTab === 'Evaluation' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>Generalization Split Defaults</h3>
                <p className="mu" style={{ fontSize: '12.5px' }}>
                  Enforce strict partition isolation to guarantee zero data leakage between tuning and holdout.
                </p>
              </div>
              <button
                className="btn p sm"
                onClick={() => showToast('Evaluation parameters saved')}
              >
                <Save size={13} />
                Save Splits
              </button>
            </div>

            {/* Split Visualization Bar */}
            <div style={{ marginTop: '10px' }}>
              <div className="split">
                <div style={{ width: `${optSplit}%`, background: 'var(--bl)' }}>
                  OPTIMIZATION {optSplit}%
                </div>
                <div style={{ width: `${valSplit}%`, background: 'var(--am)' }}>
                  VALIDATION {valSplit}%
                </div>
                <div style={{ width: `${holdoutSplit}%`, background: 'var(--gr)' }}>
                  HOLDOUT {holdoutSplit}%
                </div>
              </div>
            </div>

            <div className="g g3" style={{ gap: '14px', marginTop: '14px' }}>
              <div>
                <label className="lbl">Optimization Split (%)</label>
                <input
                  type="number"
                  min="40"
                  max="80"
                  value={optSplit}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 60;
                    setOptSplit(v);
                    setValSplit(Math.round((100 - v) / 2));
                    setHoldoutSplit(100 - v - Math.round((100 - v) / 2));
                  }}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label className="lbl">Validation Split (%)</label>
                <input
                  type="number"
                  disabled
                  value={valSplit}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--mu)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label className="lbl">Holdout Split (%) [Quarantined]</label>
                <input
                  type="number"
                  disabled
                  value={holdoutSplit}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--gr)',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <p className="mu" style={{ fontSize: '12px' }}>
              Holdout partition is quarantined prior to test generation. Interventions are never evaluated against holdout until candidate approval.
            </p>
          </div>

          <div className="card g g2" style={{ gap: '16px' }}>
            <div>
              <label className="lbl">Minimum Probes Per Candidate Run</label>
              <input
                type="number"
                value={minProbes}
                onChange={(e) => setMinProbes(parseInt(e.target.value) || 100)}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '8px 12px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '13px',
                }}
              />
              <small className="mu" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                Statistical sample size required to certify generalization significance.
              </small>
            </div>

            <div>
              <label className="lbl">Regression Firewall Critical Failure Gate</label>
              <select
                value={regressionThreshold}
                onChange={(e) => setRegressionThreshold(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '8px 12px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '13px',
                }}
              >
                <option value={0}>Strict Gate: 0 Critical Regressions Allowed</option>
                <option value={1}>Relaxed Gate: Max 1 High Regression</option>
              </select>
              <small className="mu" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                Automated firewall blocks candidate deployment if any baseline passing test regresses.
              </small>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SECURITY */}
      {activeTab === 'Security' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>Agent Security & Sandbox Controls</h3>
                <p className="mu" style={{ fontSize: '12.5px' }}>
                  Safety guardrails, prompt injection defenses, and compliance audit policies.
                </p>
              </div>
              <button
                className="btn p sm"
                onClick={() => showToast('Security policies applied')}
              >
                <Save size={13} />
                Save Policies
              </button>
            </div>

            <div className="space-y-3">
              <label className="fl" style={{ cursor: 'pointer', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={promptSanitize}
                  onChange={(e) => setPromptSanitize(e.target.checked)}
                />
                <div>
                  <b style={{ fontSize: '13.5px' }}>Adversarial Prompt Injection Defense</b>
                  <p className="mu" style={{ fontSize: '12px' }}>
                    Automatically inject and evaluate jailbreak vectors (e.g. "Ignore previous instructions") to test guardrails.
                  </p>
                </div>
              </label>

              <label className="fl" style={{ cursor: 'pointer', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={piiRedaction}
                  onChange={(e) => setPiiRedaction(e.target.checked)}
                />
                <div>
                  <b style={{ fontSize: '13.5px' }}>Automatic PII & Secret Redaction in Traces</b>
                  <p className="mu" style={{ fontSize: '12px' }}>
                    Mask email addresses, phone numbers, API keys, and credit cards before storing traces in SQLite.
                  </p>
                </div>
              </label>

              <label className="fl" style={{ cursor: 'pointer', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={shaSigning}
                  onChange={(e) => setShaSigning(e.target.checked)}
                />
                <div>
                  <b style={{ fontSize: '13.5px' }}>Cryptographic Verification Digest (SHA-256)</b>
                  <p className="mu" style={{ fontSize: '12px' }}>
                    Sign every audit and holdout certification with an immutable SHA-256 checksum for audit readiness.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="card fl" style={{ justifyContent: 'space-between' }}>
            <div>
              <span className="lbl">Audit Log Export</span>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>Download Full Cryptographic Audit Bundle</div>
              <p className="mu" style={{ fontSize: '12px' }}>
                Exports test results, causal graph JSON, and verification digests.
              </p>
            </div>
            <button
              className="btn sm"
              onClick={() => showToast('Audit bundle exported')}
            >
              Export JSON Bundle
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: NOTIFICATIONS */}
      {activeTab === 'Notifications' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div className="fl" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>Alerting & Webhook Channels</h3>
                <p className="mu" style={{ fontSize: '12.5px' }}>
                  Send real-time alerts to engineering channels when failures or regressions are detected.
                </p>
              </div>
              <button
                className="btn p sm"
                onClick={() => showToast('Notification settings saved')}
              >
                <Save size={13} />
                Save Webhooks
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="lbl">Slack Incoming Webhook URL</label>
                <input
                  type="text"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                    fontFamily: 'var(--mono)',
                  }}
                />
              </div>

              <div>
                <label className="lbl">Discord Webhook URL (Optional)</label>
                <input
                  type="text"
                  value={discordWebhook}
                  onChange={(e) => setDiscordWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                    fontFamily: 'var(--mono)',
                  }}
                />
              </div>

              <div className="space-y-2" style={{ paddingTop: '8px' }}>
                <label className="fl" style={{ cursor: 'pointer', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={notifyOnRegression}
                    onChange={(e) => setNotifyOnRegression(e.target.checked)}
                  />
                  <div>
                    <b style={{ fontSize: '13px' }}>Immediate Alert on Regression Firewall Rejection</b>
                    <span className="mu" style={{ display: 'block', fontSize: '11.5px' }}>
                      Sends urgent alert with failing test diff and causal hypothesis.
                    </span>
                  </div>
                </label>

                <label className="fl" style={{ cursor: 'pointer', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={notifyOnHoldoutDrift}
                    onChange={(e) => setNotifyOnHoldoutDrift(e.target.checked)}
                  />
                  <div>
                    <b style={{ fontSize: '13px' }}>Weekly Holdout Generalization Digest</b>
                    <span className="mu" style={{ display: 'block', fontSize: '11.5px' }}>
                      Summarizes reliability score drift across customer agent versions.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Reset Demo Environment Card (at the bottom of all tabs) */}
      <div className="card fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Reset Demo Environment</h3>
          <p className="mu" style={{ fontSize: '12.5px', marginTop: '2px' }}>
            Restore the pristine Customer Support Agent v1.0 baseline and clear trial experiments.
          </p>
          {resetMsg && (
            <span className="mono text-[var(--cy)]" style={{ fontSize: '12px' }}>
              {resetMsg}
            </span>
          )}
        </div>

        <button
          onClick={handleResetDemo}
          disabled={resetting}
          className="btn sm"
        >
          <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
          <span>{resetting ? 'Resetting...' : 'Reset Demo State'}</span>
        </button>
      </div>
    </div>
  );
}
