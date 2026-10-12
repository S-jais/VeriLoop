'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { VeriLoopCore } from '@/components/VeriLoopCore';
import { VeriLoopLogo } from '@/components/Logo';
import { NEMOTRON_MODEL_ID, SPONSOR_STRIP } from '@/lib/config';

const FAILURE_MODES = [
  'Outdated knowledge',
  'Bad tool selection',
  'Missing context',
  'Policy violations',
  'Prompt injection',
  'Retrieval failures',
  'Incorrect reasoning',
  'Workflow failures',
];

const LOOP_STAGES = [
  ['Test', 'Generate scenarios, split into optimization, validation and holdout.'],
  ['Diagnose', 'Trace each failure to a likely cause with evidence.'],
  ['Intervene', 'Try prompt, tool, retrieval, memory, guardrail or workflow fixes.'],
  ['Validate', 'Measure each candidate on cases it was not tuned on.'],
  ['Prove', 'Check holdout and regressions, then verify or reject.'],
];

const CAPABILITIES = [
  'Agent evaluation',
  'Failure diagnosis',
  'Controlled experiments',
  'Holdout validation',
  'Regression protection',
];

export default function LandingPage() {
  const router = useRouter();

  const handleRunEvaluation = () => {
    router.push('/dashboard');
  };

  return (
    <div className="land min-h-screen text-[var(--tx)] w-full overflow-x-hidden">
      {/* Top Navbar: Full-width sticky header */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 2vw, 16px)',
          padding: '12px max(16px, 4vw)',
          borderBottom: '1px solid rgba(26, 42, 49, 0.85)',
          background: 'rgba(7, 11, 14, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          width: '100%',
        }}
      >
        {/* VeriLoop Logo and Text - Clicking opens Home Page */}
        {/* VeriLoop Logo - Clicking opens Home Page */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            textDecoration: 'none',
          }}
          title="VeriLoop Home"
        >
          <VeriLoopLogo height={34} />
        </Link>

        <span className="sp" />

        <a className="mu hidden sm:inline" href="#how" style={{ fontSize: '13.5px' }}>
          How it works
        </a>

        <Link
          className="mu hover:text-[var(--tx)] transition-colors"
          href="/login"
          style={{ fontSize: '13.5px', textDecoration: 'none', marginLeft: '4px' }}
        >
          Sign In
        </Link>

        <Link
          className="btn p whitespace-nowrap"
          href="/dashboard"
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          Open app
        </Link>
      </nav>

      {/* Full Screen Plasma Vortex Hero Stage (Step rail stays 100% visible on screen above fold) */}
      <VeriLoopCore
        demoMode={true}
        variant="hero"
        onRunClick={handleRunEvaluation}
      />

      {/* Built With Sponsor Strip (Relocated below hero stage so step rail is visible above fold) */}
      <div
        className="w-full text-center py-2.5 px-4 mono mu"
        style={{
          fontSize: '12px',
          background: 'rgba(5, 12, 16, 0.95)',
          borderTop: '1px solid rgba(34, 209, 230, 0.15)',
          borderBottom: '1px solid rgba(34, 209, 230, 0.15)',
          letterSpacing: '0.02em',
        }}
      >
        <span style={{ color: 'var(--cy)', fontWeight: 600 }}>Built with: </span>
        <span>{SPONSOR_STRIP}</span>
      </div>

      {/* Section: Why AI agents fail */}
      <section
        style={{
          padding: 'clamp(48px, 8vw, 80px) max(16px, 4vw)',
          maxWidth: '1240px',
          margin: 'auto',
          display: 'grid',
          gap: '22px',
        }}
      >
        <h2>Why AI agents fail</h2>
        <div
          className="g g4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
        >
          {FAILURE_MODES.map((fm) => (
            <div key={fm} className="card">
              <h3>{fm}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Section: The VeriLoop loop */}
      <section
        id="how"
        style={{
          padding: 'clamp(48px, 8vw, 80px) max(16px, 4vw)',
          maxWidth: '1240px',
          margin: 'auto',
          display: 'grid',
          gap: '22px',
        }}
      >
        <h2>The VeriLoop loop</h2>
        <div
          className="g g4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {LOOP_STAGES.map(([title, desc]) => (
            <div key={title} className="card">
              <h3>{title}</h3>
              <p className="mu" style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.5 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section: From failure to proof */}
      <section
        style={{
          padding: 'clamp(48px, 8vw, 80px) max(16px, 4vw)',
          maxWidth: '1240px',
          margin: 'auto',
          display: 'grid',
          gap: '22px',
        }}
      >
        <h2>From failure to proof</h2>
        <div className="flow" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span>Failure detected</span>
          <i>→</i>
          <span>Root cause</span>
          <i>→</i>
          <span>Targeted fix</span>
          <i>→</i>
          <span>Validation</span>
          <i>→</i>
          <span>Holdout</span>
          <i>→</i>
          <span>Regression firewall</span>
          <i>→</i>
          <span className="f">Verified</span>
        </div>
      </section>

      {/* Section: Built for real AI engineering */}
      <section
        style={{
          padding: 'clamp(48px, 8vw, 80px) max(16px, 4vw)',
          maxWidth: '1240px',
          margin: 'auto',
          display: 'grid',
          gap: '22px',
        }}
      >
        <h2>Built for real AI engineering</h2>
        <div className="card g g2" style={{ gap: '24px' }}>
          <div>
            <p className="mu" style={{ fontSize: '14px', lineHeight: 1.6 }}>
              Nebius Token Factory serves the high-throughput inference layer. NVIDIA Nemotron ({NEMOTRON_MODEL_ID}) handles test generation, causal failure reasoning and holdout judging. Tavily supplies external grounding evidence when a failure diagnosis requires current policy lookup.
            </p>
            <div className="fl" style={{ marginTop: '14px', flexWrap: 'wrap' }}>
              <span className="bd in"><i></i>NEBIUS TOKEN FACTORY (INFERENCE)</span>
              <span className="bd in"><i></i>NVIDIA NEMOTRON (REASONING & JUDGING)</span>
              <span className="bd in"><i></i>TAVILY (EXTERNAL EVIDENCE)</span>
            </div>
          </div>
          <div className="fl" style={{ alignContent: 'flex-start', flexWrap: 'wrap' }}>
            {CAPABILITIES.map((cap) => (
              <span key={cap} className="bd">
                <i></i>{cap}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Section: Don't trust an agent because it passed a demo. Prove it. */}
      <section
        style={{
          padding: 'clamp(64px, 10vw, 100px) max(16px, 4vw) 120px',
          maxWidth: '1240px',
          margin: 'auto',
          textAlign: 'center',
          display: 'grid',
          gap: '16px',
          justifyItems: 'center',
        }}
      >
        <h2>Don’t trust an agent because it passed a demo.</h2>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 44px)' }}>Prove it.</h1>
        <button
          className="btn p"
          onClick={handleRunEvaluation}
          style={{ marginTop: '10px' }}
        >
          <Play size={13} fill="currentColor" />
          Run Evaluation
        </button>
      </section>
    </div>
  );
}
