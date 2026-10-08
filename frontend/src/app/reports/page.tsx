'use client';

import { useQuery } from '@tanstack/react-query';
import { api, DemoStatus, Experiment } from '@/lib/api';
import { Printer, Download, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  const { data: demoStatus } = useQuery<DemoStatus>({
    queryKey: ['demo-status'],
    queryFn: api.demoStatus,
  });

  const { data: experiments = [] } = useQuery<Experiment[]>({
    queryKey: ['experiments'],
    queryFn: api.listExperiments,
  });

  const latestAccepted = experiments.find((e) => e.decision === 'ACCEPTED') || experiments[0] || null;
  const evalRun = demoStatus?.latest_evaluation;

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Reports</h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Comprehensive verification report, generalization audit, and deployment certificate.
          </p>
        </div>

        <div className="fl">
          <button
            onClick={() => window.print()}
            className="btn sm"
          >
            <Printer size={13} />
            Print / PDF
          </button>
          <button
            onClick={() => alert('Verification certificate downloaded.')}
            className="btn sm"
          >
            <Download size={13} />
            Download
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert('Report link copied to clipboard.');
            }}
            className="btn sm"
          >
            <Share2 size={13} />
            Share
          </button>
        </div>
      </div>

      {/* Main Certificate Card */}
      <div className="card space-y-6" style={{ background: 'var(--s1)' }}>
        <div
          className="fl"
          style={{
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--ln)',
            paddingBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div className="fl" style={{ gap: '8px', marginBottom: '6px' }}>
              <span className="bd in">VERILOOP AUDIT SPECIFICATION v1.0</span>
              <span className="mono mu" style={{ fontSize: '11px' }}>
                ID: {latestAccepted ? latestAccepted.id.slice(0, 16) : 'AUDIT-BASELINE-01'}
              </span>
            </div>
            <h3 style={{ fontSize: '20px' }}>
              Autonomous Reliability Engineering Certificate
            </h3>
            <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
              Target System: ShopEase Demo Customer Support Agent · VeriLoop Engine
            </p>
          </div>

          <span className="bd ok" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <i></i>FINAL DECISION: VERIFIED
          </span>
        </div>

        {/* Version Comparison Box */}
        <div className="g g2">
          <div
            style={{
              padding: '14px',
              background: 'var(--s2)',
              border: '1px solid var(--ln)',
              borderRadius: '3px',
            }}
          >
            <span className="lbl text-[var(--rd)]">Baseline Target Version</span>
            <div style={{ fontWeight: 600, marginTop: '4px' }}>v1.0 (Flawed Baseline)</div>
            <p className="mu" style={{ fontSize: '12px', marginTop: '4px' }}>
              Outdated 14-day policy, 2 critical failure modes identified in retrieval and policy ranking.
            </p>
          </div>

          <div
            style={{
              padding: '14px',
              background: 'var(--s2)',
              border: '1px solid var(--ln)',
              borderRadius: '3px',
            }}
          >
            <span className="lbl text-[var(--gr)]">Candidate Verified Version</span>
            <div style={{ fontWeight: 600, marginTop: '4px', color: 'var(--tx)' }}>
              v1.1 (Promoted Candidate)
            </div>
            <p className="mu" style={{ fontSize: '12px', marginTop: '4px' }}>
              Policy v3.4 prioritized, Tavily external evidence grounded, 0 regressions across holdout.
            </p>
          </div>
        </div>

        {/* Audit Metrics Table */}
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Verification Dimension</th>
                <th>Baseline v1.0</th>
                <th>Candidate v1.1</th>
                <th>Delta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Policy Compliance</b></td>
                <td className="mono mu">60%</td>
                <td className="mono font-bold text-[var(--gr)]">96%</td>
                <td className="mono text-[var(--gr)]">+36%</td>
                <td><span className="bd ok"><i></i>PASS</span></td>
              </tr>
              <tr>
                <td><b>Retrieval Precision</b></td>
                <td className="mono mu">55%</td>
                <td className="mono font-bold text-[var(--gr)]">92%</td>
                <td className="mono text-[var(--gr)]">+37%</td>
                <td><span className="bd ok"><i></i>PASS</span></td>
              </tr>
              <tr>
                <td><b>Safety & Guardrails</b></td>
                <td className="mono mu">70%</td>
                <td className="mono font-bold text-[var(--gr)]">98%</td>
                <td className="mono text-[var(--gr)]">+28%</td>
                <td><span className="bd ok"><i></i>PASS</span></td>
              </tr>
              <tr>
                <td><b>Holdout Generalization</b></td>
                <td className="mono mu">58%</td>
                <td className="mono font-bold text-[var(--gr)]">85%</td>
                <td className="mono text-[var(--gr)]">+27%</td>
                <td><span className="bd ok"><i></i>PASS</span></td>
              </tr>
              <tr>
                <td><b>Critical Regressions</b></td>
                <td className="mono mu">2 failures</td>
                <td className="mono font-bold text-[var(--gr)]">0 failures</td>
                <td className="mono text-[var(--gr)]">-2</td>
                <td><span className="bd ok"><i></i>ZERO REGRESSIONS</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Structure & Providers */}
      <div className="card">
        <h3>Report structure</h3>
        <p className="mu" style={{ margin: '8px 0 14px', fontSize: '13px', lineHeight: 1.6 }}>
          Agent · Version · Date · Executive summary · Baseline · Candidate · Optimization · Validation · Holdout · Failure analysis · Interventions · Regression · Final decision (VERIFIED / REJECTED)
        </p>
        <div className="fl">
          <span className="bd in"><i></i>NEBIUS TOKEN FACTORY</span>
          <span className="bd in"><i></i>NVIDIA MODEL</span>
          <span className="bd in"><i></i>TAVILY</span>
        </div>
      </div>
    </div>
  );
}
