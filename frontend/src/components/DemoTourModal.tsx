'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  X,
  ChevronRight,
  ChevronLeft,
  Activity,
  Bug,
  Search,
  FlaskConical,
  ShieldCheck,
  FileText,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import axios from 'axios';

interface TourStep {
  title: string;
  badge: string;
  tagline: string;
  description: string;
  link: string;
  linkText: string;
  icon: React.ElementType;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Baseline Adversarial Evaluation',
    badge: 'STAGE 1: TEST',
    tagline: 'Test the agent under real edge-case conditions',
    description:
      'We run an initial 10-test adversarial suite against the ShopEase Customer Support Agent. The suite intentionally tests return policy windows, damage claim photo proof, and high-value manager approvals.',
    link: '/evaluations',
    linkText: 'View Evaluation Runs',
    icon: Activity,
    color: '#0DC7E5',
  },
  {
    title: '2. Root-Cause Causal Analysis',
    badge: 'STAGE 2: DIAGNOSE',
    tagline: 'Do not just flag the failure — diagnose why it happened',
    description:
      'Inspect the reproducible failures. VeriLoop generates a multi-node causal graph: Trigger (damaged item claim) → Mechanism (no photo check) → Root Cause (outdated policy v1) → Observed Failure.',
    link: '/failures',
    linkText: 'Explore Failure Causal Graphs',
    icon: Bug,
    color: '#F59E0B',
  },
  {
    title: '3. Grounded External Research',
    badge: 'STAGE 3: GROUND',
    tagline: 'Live policy verification via Tavily AI research',
    description:
      'VeriLoop automatically searches internal documentation and organizational policy repositories via Tavily to confirm that Return Policy v2.0 is the active corporate standard.',
    link: '/evidence',
    linkText: 'Inspect Tavily Evidence',
    icon: Search,
    color: '#A855F7',
  },
  {
    title: '4. Targeted Intervention & Split Testing',
    badge: 'STAGE 4: INTERVENE',
    tagline: 'Test targeted fixes across 3 isolated data splits',
    description:
      'Apply candidate interventions (e.g. Policy v2 retrieval + photo guardrail). VeriLoop evaluates the candidate across Optimization (60%), Validation (20%), and completely Held-out (20%) test splits with zero data leakage.',
    link: '/experiments',
    linkText: 'Open Experiment Lab',
    icon: FlaskConical,
    color: '#3B82F6',
  },
  {
    title: '5. Automated Regression Firewall',
    badge: 'STAGE 5: FIREWALL',
    tagline: 'Prove the fix did not break existing behavior',
    description:
      'The Regression Firewall strictly blocks deployment if critical failures remain or if held-out generalization drops below the baseline. Candidates must pass zero-tolerance gates.',
    link: '/regression',
    linkText: 'View Regression Firewall',
    icon: ShieldCheck,
    color: '#EF4444',
  },
  {
    title: '6. Reliability Verification Certificate',
    badge: 'STAGE 6: PROVE',
    tagline: 'Cryptographic proof of generalization before deployment',
    description:
      'Generate a tamper-evident audit report with 6-dimension radar scorecards, baseline vs candidate delta transformations, and holdout generalization certificates ready for compliance review.',
    link: '/reports',
    linkText: 'View Verification Certificate',
    icon: FileText,
    color: '#10B981',
  },
];

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoTourModal({ isOpen, onClose }: DemoTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  const handleReset = async () => {
    setResetting(true);
    setResetStatus(null);
    try {
      await axios.post('http://127.0.0.1:8000/api/demo/reset');
      setResetStatus('Demo state reset to clean baseline.');
      setTimeout(() => setResetStatus(null), 4000);
    } catch {
      setResetStatus('Reset request failed. Please check backend.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(4, 8, 11, 0.85)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '640px',
          padding: 0,
          background: 'var(--s1)',
          border: '1px solid var(--ln)',
          borderRadius: '3px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Top Header */}
        <div
          className="fl"
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--ln)',
            justifyContent: 'space-between',
            background: 'var(--s2)',
          }}
        >
          <div className="fl" style={{ gap: '10px' }}>
            <Compass size={18} style={{ color: 'var(--cy)' }} />
            <div>
              <h3 style={{ fontSize: '14px', margin: 0 }}>VeriLoop Product Tour</h3>
              <p className="mu" style={{ fontSize: '11px', margin: 0 }}>
                The 6-stage autonomous reliability feedback loop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn sm"
            style={{ padding: '4px 8px', border: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid var(--ln)' }}>
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              style={{
                padding: '10px 4px',
                textAlign: 'center',
                cursor: 'pointer',
                background: currentStep === idx ? 'var(--s2)' : 'transparent',
                border: 0,
                borderBottom: currentStep === idx ? '2px solid var(--cy)' : '2px solid transparent',
              }}
            >
              <div
                className="mono font-semibold"
                style={{
                  fontSize: '11px',
                  color: currentStep === idx ? 'var(--cy)' : 'var(--mu)',
                }}
              >
                0{idx + 1}
              </div>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="fl" style={{ gap: '12px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '3px',
                background: 'var(--s2)',
                border: '1px solid var(--ln)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--cy)',
              }}
            >
              <StepIcon size={20} />
            </div>
            <div className="space-y-1">
              <span className="bd in" style={{ fontSize: '9.5px' }}>
                {step.badge}
              </span>
              <h3 style={{ fontSize: '16px', color: 'var(--tx)' }}>{step.title}</h3>
              <p className="mu" style={{ fontSize: '12px' }}>{step.tagline}</p>
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '3px',
              background: 'var(--s2)',
              border: '1px solid var(--ln)',
              fontSize: '12.5px',
              lineHeight: 1.5,
              color: 'var(--tx)',
            }}
          >
            {step.description}
          </div>

          <div className="fl" style={{ justifyContent: 'space-between', paddingTop: '4px' }}>
            <Link
              href={step.link}
              onClick={onClose}
              className="btn sm"
              style={{ color: 'var(--cy)', border: '1px solid var(--ln)' }}
            >
              {step.linkText}
              <ExternalLink size={12} />
            </Link>

            {resetStatus && (
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--gr)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> {resetStatus}
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div
          className="fl"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--ln)',
            background: 'var(--s2)',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={handleReset}
            disabled={resetting}
            className="btn sm"
            style={{ color: 'var(--rd)' }}
          >
            <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'Resetting...' : 'Reset Demo'}
          </button>

          <div className="fl" style={{ gap: '8px' }}>
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="btn sm"
            >
              <ChevronLeft size={13} /> Back
            </button>
            <button
              onClick={() => {
                if (currentStep < TOUR_STEPS.length - 1) {
                  setCurrentStep((prev) => prev + 1);
                } else {
                  onClose();
                }
              }}
              className="btn p sm"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
