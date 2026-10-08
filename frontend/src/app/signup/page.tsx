'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, User, Building, Layers, Sparkles } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [fleetType, setFleetType] = useState('Customer Support Fleet');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setTimeout(() => {
      // Simulate successful registration
      router.push('/dashboard');
    }, 700);
  };

  const handleQuickDemo = () => {
    setName('Alex Morgan');
    setEmail('alex.morgan@enterprise.ai');
    setCompany('Nexus AI Fleet Labs');
    setPassword('••••••••••••');
    setLoading(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Centered Auth Glass Card */}
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '36px 32px',
          background: 'rgba(9, 14, 18, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(34, 209, 230, 0.25)',
          borderRadius: '6px',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(34, 209, 230, 0.1)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'var(--tx)',
            }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '40px',
                height: '40px',
                background: 'var(--cy)',
                borderRadius: '4px',
                boxShadow: '0 0 16px rgba(34, 209, 230, 0.4)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M16 4a12 12 0 1 0 11 7.4"
                  fill="none"
                  stroke="#04161A"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M10.5 16.5l4 4 8-9"
                  fill="none"
                  stroke="#04161A"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em' }}>
              VERILOOP
            </span>
          </Link>
          <h2 style={{ fontSize: '20px', marginTop: '16px', fontWeight: 600 }}>
            Create VeriLoop Account
          </h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
            Start evaluating, diagnosing, and certifying AI agent fleets.
          </p>
        </div>

        {errorMsg && (
          <div className="banner" style={{ marginBottom: '16px', borderColor: 'var(--rd)', color: 'var(--rd)', background: 'rgba(248, 113, 113, 0.1)' }}>
            {errorMsg}
          </div>
        )}

        {/* Quick Demo Fill */}
        <button
          type="button"
          onClick={handleQuickDemo}
          className="btn sm"
          style={{
            width: '100%',
            marginBottom: '18px',
            background: 'rgba(34, 209, 230, 0.1)',
            borderColor: 'var(--cy)',
            color: 'var(--cy)',
            justifyContent: 'center',
            padding: '7px',
            fontSize: '12px',
          }}
        >
          <Sparkles size={12} />
          ⚡ Pre-fill Sample Enterprise Profile
        </button>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: '4px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '13px',
                }}
              />
              <User
                size={14}
                className="mu"
                style={{ position: 'absolute', left: '12px', top: '10px' }}
              />
            </div>
          </div>

          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: '4px' }}>
              Work Email *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="alex@company.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '13px',
                }}
              />
              <Mail
                size={14}
                className="mu"
                style={{ position: 'absolute', left: '12px', top: '10px' }}
              />
            </div>
          </div>

          <div className="g g2" style={{ gap: '10px' }}>
            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: '4px' }}>
                Company / Team
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Nexus AI Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '3px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '12.5px',
                  }}
                />
                <Building
                  size={13}
                  className="mu"
                  style={{ position: 'absolute', left: '11px', top: '11px' }}
                />
              </div>
            </div>

            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: '4px' }}>
                Primary Fleet
              </label>
              <select
                value={fleetType}
                onChange={(e) => setFleetType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '12.5px',
                }}
              >
                <option value="Customer Support Fleet">Customer Support</option>
                <option value="Billing & FinOps Fleet">Billing & FinOps</option>
                <option value="Booking & Travel Fleet">Booking & Travel</option>
                <option value="Code & Security Fleet">Code & Guardrail</option>
              </select>
            </div>
          </div>

          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: '4px' }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '13px',
                }}
              />
              <Lock
                size={14}
                className="mu"
                style={{ position: 'absolute', left: '12px', top: '10px' }}
              />
            </div>
          </div>

          <div style={{ paddingTop: '4px' }}>
            <label className="fl" style={{ cursor: 'pointer', gap: '8px', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              <span className="mu">
                I agree to the VeriLoop Developer Terms and Evaluation Sandbox Policy.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn p"
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
          >
            {loading ? 'Setting up Fleet...' : 'Create VeriLoop Account'}
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Login Redirect */}
        <p className="mu" style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--cy)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>

      {/* Footer Return Home */}
      <div style={{ marginTop: '16px' }}>
        <Link href="/" className="mu hover:text-white" style={{ fontSize: '12.5px' }}>
          ← Back to VeriLoop Home
        </Link>
      </div>
    </div>
  );
}
