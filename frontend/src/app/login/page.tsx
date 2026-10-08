'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setTimeout(() => {
      // Simulate successful auth
      router.push('/dashboard');
    }, 700);
  };

  const handleQuickDemo = () => {
    setEmail('demo.lead@veriloop.ai');
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
          maxWidth: '440px',
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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
            Sign In to Console
          </h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
            Autonomous reliability engineering for your AI agent fleet.
          </p>
        </div>

        {errorMsg && (
          <div className="banner" style={{ marginBottom: '16px', borderColor: 'var(--rd)', color: 'var(--rd)', background: 'rgba(248, 113, 113, 0.1)' }}>
            {errorMsg}
          </div>
        )}

        {/* Quick Demo Access Button */}
        <button
          type="button"
          onClick={handleQuickDemo}
          className="btn sm"
          style={{
            width: '100%',
            marginBottom: '20px',
            background: 'rgba(34, 209, 230, 0.1)',
            borderColor: 'var(--cy)',
            color: 'var(--cy)',
            justifyContent: 'center',
            padding: '8px',
            fontSize: '12.5px',
          }}
        >
          <Sparkles size={13} />
          ⚡ Quick Demo Access (Test Fleet)
        </button>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
              Work Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="engineer@company.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '13.5px',
                }}
              />
              <Mail
                size={14}
                className="mu"
                style={{ position: 'absolute', left: '12px', top: '12px' }}
              />
            </div>
          </div>

          <div>
            <div className="fl" style={{ justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="lbl">Password</label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Demo reset instructions sent to email.');
                }}
                className="mu hover:text-white"
                style={{ fontSize: '11.5px' }}
              >
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '3px',
                  background: 'var(--s2)',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  fontSize: '13.5px',
                }}
              />
              <Lock
                size={14}
                className="mu"
                style={{ position: 'absolute', left: '12px', top: '12px' }}
              />
            </div>
          </div>

          <div className="fl" style={{ justifyContent: 'space-between', paddingTop: '4px' }}>
            <label className="fl" style={{ cursor: 'pointer', gap: '8px', fontSize: '12.5px' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="mu">Remember this device</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn p"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Console'}
            <ArrowRight size={14} />
          </button>
        </form>

        {/* SSO Divider */}
        <div style={{ position: 'relative', margin: '24px 0 16px', textAlign: 'center' }}>
          <hr style={{ border: 0, borderTop: '1px solid var(--ln)' }} />
          <span
            style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#090E12',
              padding: '0 12px',
              fontSize: '11px',
              color: 'var(--mu)',
            }}
          >
            OR CONTINUE WITH
          </span>
        </div>

        <div className="g g2" style={{ gap: '10px' }}>
          <button
            type="button"
            className="btn sm"
            onClick={handleQuickDemo}
            style={{ justifyContent: 'center', fontSize: '12px' }}
          >
            Google SSO
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={handleQuickDemo}
            style={{ justifyContent: 'center', fontSize: '12px' }}
          >
            GitHub
          </button>
        </div>

        {/* Sign Up Redirect */}
        <p className="mu" style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
          Don’t have a VeriLoop fleet account?{' '}
          <Link href="/signup" style={{ color: 'var(--cy)', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>

      {/* Footer Return Home */}
      <div style={{ marginTop: '20px' }}>
        <Link href="/" className="mu hover:text-white" style={{ fontSize: '12.5px' }}>
          ← Back to VeriLoop Home
        </Link>
      </div>
    </div>
  );
}
