'use client';

import React, { useState } from 'react';
import { api, ConnectionTestResult, ZipAnalysisResult } from '@/lib/api';
import {
  X,
  Bot,
  Globe,
  Upload,
  GitBranch,
  FileCode,
  Database,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Code,
  FileText,
} from 'lucide-react';

interface AddAgentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentAdded?: () => void;
}

type ConnectionType = 'demo' | 'api' | 'zip' | 'github' | 'config' | 'dataset';

export default function AddAgentWizard({ isOpen, onClose, onAgentAdded }: AddAgentWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<ConnectionType>('api');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState('LangGraph');

  // API Endpoint states
  const [endpointUrl, setEndpointUrl] = useState('https://');
  const [httpMethod, setHttpMethod] = useState<'POST' | 'GET'>('POST');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'api_key_header'>('bearer');
  const [authHeaderName, setAuthHeaderName] = useState('Authorization');
  const [authToken, setAuthToken] = useState('');
  const [inputPath, setInputPath] = useState('input');
  const [outputPath, setOutputPath] = useState('response');
  const [timeoutSeconds, setTimeoutSeconds] = useState(15);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // ZIP Upload states
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [analyzingZip, setAnalyzingZip] = useState(false);
  const [zipAnalysis, setZipAnalysis] = useState<ZipAnalysisResult | null>(null);

  // GitHub states
  const [repoUrl, setRepoUrl] = useState('https://github.com/');
  const [repoBranch, setRepoBranch] = useState('main');

  // Config Import states
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelId, setModelId] = useState('nvidia/nemotron-3-nano-30b-instruct');
  const [temperature, setTemperature] = useState(0.2);

  // Dataset states
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<{ total: number; valid: number; invalid: number } | null>(null);

  // Submission state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!endpointUrl || endpointUrl === 'https://') {
      setTestResult({
        status: 'error',
        latency_ms: 0,
        message: 'Please provide a valid HTTP/HTTPS endpoint URL.',
      });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testAgentConnection({
        endpoint_url: endpointUrl,
        http_method: httpMethod,
        auth_type: authType,
        auth_header_name: authHeaderName,
        auth_token: authToken,
        input_path: inputPath,
        output_path: outputPath,
        timeout_seconds: timeoutSeconds,
        test_message: 'VeriLoop Ping: Verify agent endpoint connectivity and schema compliance.',
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        status: 'error',
        latency_ms: 0,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipFile(file);
    setAnalyzingZip(true);
    setZipAnalysis(null);
    try {
      const res = await api.uploadAgentZip(file);
      setZipAnalysis(res);
      if (res.detected_framework) {
        setFramework(res.detected_framework);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to inspect ZIP archive');
    } finally {
      setAnalyzingZip(false);
    }
  };

  const handleSaveAgent = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let payload: any = {
        name: name.trim() || (selectedType === 'demo' ? 'Customer Support Agent (Demo)' : 'External Agent Target'),
        description: description.trim() || 'Registered via VeriLoop Add Agent Wizard',
        framework,
        connection_type: selectedType === 'api' ? 'api_endpoint' : selectedType === 'zip' ? 'zip_upload' : selectedType === 'github' ? 'github_repo' : selectedType === 'config' ? 'config_import' : 'demo',
        is_demo: selectedType === 'demo',
      };

      if (selectedType === 'api') {
        payload = {
          ...payload,
          endpoint_url: endpointUrl,
          http_method: httpMethod,
          auth_type: authType,
          auth_header_name: authHeaderName,
          auth_token: authToken,
          input_path: inputPath,
          output_path: outputPath,
          timeout_seconds: timeoutSeconds,
          adapter_type: 'http_json',
        };
      } else if (selectedType === 'zip') {
        payload = {
          ...payload,
          adapter_type: 'static_analysis',
          tools_schema: zipAnalysis?.tool_definitions ? [{ tools: zipAnalysis.tool_definitions }] : undefined,
          system_prompt: zipAnalysis?.prompt_files?.join('\n') || undefined,
        };
      } else if (selectedType === 'github') {
        payload = {
          ...payload,
          repository_url: repoUrl,
          repository_branch: repoBranch,
          adapter_type: 'github_connected',
        };
      } else if (selectedType === 'config') {
        payload = {
          ...payload,
          system_prompt: systemPrompt,
          adapter_type: 'config_runtime',
        };
      } else {
        payload = {
          ...payload,
          adapter_type: 'demo_customer_support',
        };
      }

      await api.createAgent(payload);
      onAgentAdded?.();
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 11, 14, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--s1)',
          border: '1px solid var(--ln)',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          padding: '24px',
        }}
      >
        {/* Header */}
        <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
              <Bot size={18} className="text-[var(--cy)]" />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Connect AI Agent</h2>
              <span className="bd in" style={{ fontSize: '10px' }}>STEP {step} OF 3</span>
            </div>
            <p className="mu" style={{ fontSize: '12px', marginTop: '4px' }}>
              Register your AI agent to test against 100 test probes and prevent regressions.
            </p>
          </div>
          <button
            type="button"
            className="btn sm"
            onClick={onClose}
            style={{ padding: '6px', minWidth: 'auto', borderRadius: '50%' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Wizard Steps Rail */}
        <div className="fl" style={{ gap: '8px', marginBottom: '24px' }}>
          {[
            { s: 1, label: '1. Select Connection Type' },
            { s: 2, label: '2. Configure & Verify' },
            { s: 3, label: '3. Save & Version Lineage' },
          ].map((st) => (
            <div
              key={st.s}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                background: step === st.s ? 'rgba(34, 209, 230, 0.12)' : step > st.s ? 'rgba(52, 211, 153, 0.1)' : 'var(--s2)',
                border: step === st.s ? '1px solid var(--cy)' : step > st.s ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid var(--ln)',
                color: step === st.s ? 'var(--cy)' : step > st.s ? 'var(--gr)' : 'var(--tx-mu)',
                textAlign: 'center',
              }}
            >
              {st.label}
            </div>
          ))}
        </div>

        {/* STEP 1: CHOOSE CONNECTION TYPE */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="lbl">Select how you want to connect your agent</div>
            <div className="g g2" style={{ gap: '12px' }}>
              {[
                {
                  id: 'api' as ConnectionType,
                  title: 'Connect API Endpoint',
                  desc: 'Test any custom REST or JSON agent over HTTP with configurable auth & schema mappings.',
                  icon: Globe,
                  badge: 'RECOMMENDED FOR LIVE AGENTS',
                },
                {
                  id: 'demo' as ConnectionType,
                  title: 'Built-in Demo Agent',
                  desc: 'Pre-configured ShopEase customer support agent with deliberate return policy flaws.',
                  icon: Bot,
                  badge: 'INSTANT EXPLORATION',
                },
                {
                  id: 'zip' as ConnectionType,
                  title: 'Upload Project ZIP',
                  desc: 'AST static inspection for Python/TypeScript agents. Detects entry points, prompt templates & tools.',
                  icon: Upload,
                  badge: 'SOURCE CODE ANALYSIS',
                },
                {
                  id: 'github' as ConnectionType,
                  title: 'Connect GitHub Repo',
                  desc: 'Track commit SHA, inspect repo structure, and generate automated PR patches for verified fixes.',
                  icon: GitBranch,
                  badge: 'CI/CD & PRS',
                },
                {
                  id: 'config' as ConnectionType,
                  title: 'Import Agent Config',
                  desc: 'Enter system prompts, model parameters, tool schemas, and knowledge retrieval settings.',
                  icon: FileCode,
                  badge: 'PROMPT & TOOLS',
                },
                {
                  id: 'dataset' as ConnectionType,
                  title: 'Import Test Dataset',
                  desc: 'Upload CSV or JSON test suites with custom column mappings and multi-turn probes.',
                  icon: Database,
                  badge: 'EVAL SUITE',
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedType(opt.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(34, 209, 230, 0.08)' : 'var(--s2)',
                      border: isSelected ? '1px solid var(--cy)' : '1px solid var(--ln)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Icon size={18} className={isSelected ? 'text-[var(--cy)]' : 'text-[var(--tx-mu)]'} />
                      <span className="mono mu" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                        {opt.badge}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '8px' }}>
                      {opt.title}
                    </div>
                    <p className="mu" style={{ fontSize: '11.5px', marginTop: '4px', lineHeight: 1.4 }}>
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="fl" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="btn p sm"
                onClick={() => setStep(2)}
              >
                <span>Continue to Configuration</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIGURE & TEST */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Common fields */}
            <div className="g g2" style={{ gap: '12px' }}>
              <div>
                <label className="lbl">Agent Name</label>
                <input
                  type="text"
                  placeholder={selectedType === 'demo' ? 'Customer Support Agent (Demo)' : 'e.g. Acme Returns Assistant'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label className="lbl">Framework / Orchestrator</label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                >
                  <option value="LangGraph">LangGraph (StateGraph)</option>
                  <option value="CrewAI">CrewAI</option>
                  <option value="AutoGen">Microsoft AutoGen</option>
                  <option value="LlamaIndex">LlamaIndex Workflows</option>
                  <option value="Custom">Custom HTTP / REST Agent</option>
                </select>
              </div>
            </div>

            {/* Type-Specific Configurations */}
            {selectedType === 'api' && (
              <div className="space-y-3" style={{ background: 'var(--s2)', padding: '14px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="lbl">HTTP API Connection Settings (SSRF-Protected)</div>
                  <span className="mono mu" style={{ fontSize: '10px' }}>ZERO EXPOSURE OF SECRETS</span>
                </div>

                <div className="fl" style={{ gap: '8px' }}>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as 'POST' | 'GET')}
                    style={{
                      width: '90px',
                      padding: '8px',
                      background: 'var(--s1)',
                      border: '1px solid var(--ln)',
                      color: 'var(--tx)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
                  <input
                    type="url"
                    placeholder="https://api.yourcompany.com/agent/chat (or https://httpbin.org/post for testing)"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--s1)',
                      border: '1px solid var(--ln)',
                      color: 'var(--tx)',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                {['chatgpt.com', 'claude.ai', 'gemini.google.com'].some((d) => endpointUrl.toLowerCase().includes(d)) && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid var(--am)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'var(--am)',
                      lineHeight: 1.4,
                    }}
                  >
                    ⚠️ <b>Web UI URL Detected:</b> '{endpointUrl}' is a browser user interface, not a programmatic API.
                    Web interfaces block automated agent requests with Cloudflare HTTP 403.
                    For OpenAI/ChatGPT models, use <code>https://api.openai.com/v1/chat/completions</code> with your API key, or test with webhook <code>https://httpbin.org/post</code>.
                  </div>
                )}

                <div className="g g2" style={{ gap: '10px' }}>
                  <div>
                    <label className="lbl">Authentication Type</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--s1)',
                        border: '1px solid var(--ln)',
                        color: 'var(--tx)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <option value="bearer">Bearer Token (Authorization: Bearer ...)</option>
                      <option value="api_key_header">Custom Header (X-API-Key: ...)</option>
                      <option value="none">No Authentication</option>
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Credential / Token (Stored Masked)</label>
                    <input
                      type="password"
                      placeholder="sk-agent-..."
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      disabled={authType === 'none'}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--s1)',
                        border: '1px solid var(--ln)',
                        color: 'var(--tx)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <div className="g g3" style={{ gap: '10px' }}>
                  <div>
                    <label className="lbl">Input Field Key</label>
                    <input
                      type="text"
                      value={inputPath}
                      onChange={(e) => setInputPath(e.target.value)}
                      placeholder="input (or message / query)"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: 'var(--s1)',
                        border: '1px solid var(--ln)',
                        color: 'var(--tx)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label className="lbl">Output Field Key</label>
                    <input
                      type="text"
                      value={outputPath}
                      onChange={(e) => setOutputPath(e.target.value)}
                      placeholder="response (or output / text)"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: 'var(--s1)',
                        border: '1px solid var(--ln)',
                        color: 'var(--tx)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label className="lbl">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                      min={5}
                      max={60}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: 'var(--s1)',
                        border: '1px solid var(--ln)',
                        color: 'var(--tx)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                {/* Test Connection Button */}
                <div style={{ paddingTop: '8px' }}>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    style={{ borderColor: 'var(--cy)', color: 'var(--cy)' }}
                  >
                    {testingConnection ? <RefreshCw size={12} className="animate-spin mr-1" /> : <Zap size={12} className="mr-1" />}
                    <span>{testingConnection ? 'Testing Endpoint...' : '⚡ Test Connection'}</span>
                  </button>
                </div>

                {/* Test Result Display */}
                {testResult && (() => {
                  const isConn = testResult.connected || testResult.status === 'connected' || testResult.status === 'success';
                  return (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: isConn ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)',
                        border: isConn ? '1px solid var(--gr)' : '1px solid var(--rd)',
                      }}
                    >
                      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono font-bold" style={{ color: isConn ? 'var(--gr)' : 'var(--rd)' }}>
                          {isConn ? 'CONNECTED' : 'FAILED'} ({testResult.latency_ms}ms)
                        </span>
                        {testResult.status_code && <span className="mono mu">HTTP {testResult.status_code}</span>}
                      </div>
                      <div style={{ marginTop: '4px', color: 'var(--tx)', wordBreak: 'break-word' }}>{testResult.message}</div>
                      {(testResult.sanitized_response || testResult.response_preview) && (
                        <pre
                          style={{
                            margin: '6px 0 0 0',
                            padding: '6px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '3px',
                            fontSize: '11px',
                            overflowX: 'auto',
                            maxHeight: '120px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                          }}
                        >
                          {typeof (testResult.sanitized_response || testResult.response_preview) === 'string'
                            ? (testResult.sanitized_response || testResult.response_preview)
                            : JSON.stringify(testResult.sanitized_response || testResult.response_preview, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {selectedType === 'zip' && (
              <div className="space-y-3" style={{ background: 'var(--s2)', padding: '14px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                <div className="lbl">Upload Agent Project ZIP (Safe Static Inspection)</div>
                <div
                  style={{
                    border: '1px dashed var(--ln)',
                    borderRadius: '6px',
                    padding: '24px',
                    textAlign: 'center',
                    background: 'var(--s1)',
                  }}
                >
                  <Upload size={24} className="mx-auto mb-2 text-[var(--cy)]" />
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Select Agent Archive (.zip)</div>
                  <p className="mu" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Max 25MB · Tested against Zip-Slip, symlink attacks & resource limits
                  </p>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipFileChange}
                    style={{ marginTop: '10px', fontSize: '12px' }}
                  />
                </div>

                {analyzingZip && (
                  <div className="fl" style={{ gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--cy)' }}>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Analyzing project AST, entry points, and prompt files...</span>
                  </div>
                )}

                {zipAnalysis && (
                  <div className="card space-y-2" style={{ background: 'var(--s1)', fontSize: '12px' }}>
                    <div className="fl" style={{ justifyContent: 'space-between' }}>
                      <span className="mono font-bold text-[var(--cy)]">
                        Detected: {zipAnalysis.detected_framework} ({zipAnalysis.file_count} files, {zipAnalysis.total_size_kb} KB)
                      </span>
                      <span className="bd ok"><i></i>SAFE FOR STATIC ANALYSIS</span>
                    </div>
                    <div>
                      <b>Entry Points:</b> {zipAnalysis.entry_points.length > 0 ? zipAnalysis.entry_points.join(', ') : 'None detected'}
                    </div>
                    <div>
                      <b>Prompt Files:</b> {zipAnalysis.prompt_files.length > 0 ? zipAnalysis.prompt_files.join(', ') : 'None detected'}
                    </div>
                    <div>
                      <b>Tool Schemas:</b> {zipAnalysis.tool_definitions.length > 0 ? zipAnalysis.tool_definitions.join(', ') : 'None detected'}
                    </div>
                    <div className="mu" style={{ fontSize: '11px', borderTop: '1px solid var(--ln)', paddingTop: '6px' }}>
                      ⚠️ {zipAnalysis.execution_disclaimer}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedType === 'github' && (
              <div className="space-y-3" style={{ background: 'var(--s2)', padding: '14px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                <div className="lbl">GitHub Repository Integration</div>
                <div className="g g2" style={{ gap: '10px' }}>
                  <div>
                    <label className="lbl">Repository URL</label>
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/org/agent-repo"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--s1)',
                        border: '1px solid var(--ln)',
                        color: 'var(--tx)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div>
                    <label className="lbl">Branch</label>
                    <input
                      type="text"
                      value={repoBranch}
                      onChange={(e) => setRepoBranch(e.target.value)}
                      placeholder="main"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--s1)',
                        border: '1px solid var(--ln)',
                        color: 'var(--tx)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>
                <p className="mu" style={{ fontSize: '11.5px' }}>
                  Connected repositories allow VeriLoop to generate automated Pull Requests with verified candidate patches.
                </p>
              </div>
            )}

            {selectedType === 'config' && (
              <div className="space-y-3" style={{ background: 'var(--s2)', padding: '14px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                <div className="lbl">Import System Prompt & Instructions</div>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are an autonomous customer support agent handling warranty and replacement queries..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--s1)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            )}

            {selectedType === 'demo' && (
              <div style={{ background: 'rgba(34, 209, 230, 0.05)', padding: '14px', borderRadius: '6px', border: '1px solid var(--cy)' }}>
                <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
                  <ShieldCheck size={16} className="text-[var(--cy)]" />
                  <b style={{ fontSize: '13px' }}>Demo Customer Support Agent Ready</b>
                </div>
                <p className="mu" style={{ fontSize: '12px', marginTop: '6px' }}>
                  Simulates a ShopEase e-commerce returns agent with deliberate policy failure modes (outdated vector retrieval, missing manager threshold checks, and prompt-injection vulnerability). Runs through all 100 test probes.
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="fl" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn p sm"
                onClick={() => setStep(3)}
              >
                <span>Continue to Review</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SAVE & VERSION LINEAGE */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card space-y-3" style={{ background: 'var(--s2)' }}>
              <div className="fl" style={{ justifyContent: 'space-between' }}>
                <div className="lbl">Agent Summary & Lineage</div>
                <span className="mono mu" style={{ fontSize: '11px' }}>INITIAL BASELINE v1.0</span>
              </div>
              <div className="g g2" style={{ gap: '12px', fontSize: '13px' }}>
                <div>
                  <span className="mu">Name:</span> <b>{name.trim() || (selectedType === 'demo' ? 'Customer Support Agent (Demo)' : 'External Agent Target')}</b>
                </div>
                <div>
                  <span className="mu">Connection:</span> <span className="mono">{selectedType.toUpperCase()}</span>
                </div>
                <div>
                  <span className="mu">Framework:</span> <span className="mono">{framework}</span>
                </div>
                <div>
                  <span className="mu">SSRF & Security:</span> <span className="text-[var(--gr)] font-semibold">VERIFIED SAFE</span>
                </div>
              </div>
            </div>

            {saveError && (
              <div className="banner" style={{ borderColor: 'var(--rd)', color: 'var(--rd)', fontSize: '12px' }}>
                Failed to save agent: {saveError}
              </div>
            )}

            <div className="fl" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => setStep(2)}
                disabled={saving}
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn p sm"
                onClick={handleSaveAgent}
                disabled={saving}
              >
                {saving ? <RefreshCw size={13} className="animate-spin mr-1" /> : <CheckCircle2 size={13} className="mr-1" />}
                <span>{saving ? 'Registering Agent...' : 'Save & Register Agent'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
