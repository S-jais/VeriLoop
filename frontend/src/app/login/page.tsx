'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { DATA_SOURCE } from '@/lib/config';
import { VeriLoopLogo } from '@/components/Logo';

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
      router.push('/dashboard');
    }, 400);
  };

  const handleQuickDemo = () => {
    setLoading(true);
    setEmail('hackathon.judge@veriloop.ai');
    setPassword('••••••••••••');
    setTimeout(() => {
      router.push('/dashboard');
    }, 300);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px, 4vw, 24px)',
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
          padding: 'clamp(24px, 5vw, 36px) clamp(16px, 4vw, 32px)',
          background: 'rgba(9, 14, 18, 0.75)',
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
              textDecoration: 'none',
            }}
            title="VeriLoop Home"
          >
            <VeriLoopLogo height={42} />
          </Link>
          <h2 style={{ fontSize: '20px', marginTop: '16px', fontWeight: 600 }}>
            Sign In to Console
          </h2>
          <p className="mu" style={{ fontSize: '13px', marginTop: '4px' }}>
            Autonomous reliability engineering for AI agents.
          </p>
        </div>

        {errorMsg && (
          <div
            className="banner"
            style={{
              marginBottom: '16px',
              borderColor: 'var(--rd)',
              color: 'var(--rd)',
              background: 'rgba(248, 113, 113, 0.1)',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Primary Obvious Button: Quick Demo Access for Hackathon Judges */}
        <div style={{ marginBottom: '22px' }}>
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="btn p"
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: '14.5px',
              fontWeight: 650,
              justifyContent: 'center',
              boxShadow: '0 0 18px rgba(34, 209, 230, 0.35)',
            }}
          >
            <Sparkles size={16} />
            <span>{loading ? 'Entering Console...' : 'Quick Demo Access'}</span>
            <ArrowRight size={16} />
          </button>
          <p
            style={{
              textAlign: 'center',
              fontSize: '12.5px',
              color: 'var(--cy)',
              marginTop: '8px',
              fontWeight: 500,
            }}
          >
            No account needed. Judges can use this.
          </p>
        </div>

        {/* Divider */}
        <div style={{ position: 'relative', margin: '20px 0 20px', textAlign: 'center' }}>
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
            OR SIGN IN WITH CREDENTIALS
          </span>
        </div>

        {/* Secondary Login Form */}
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
            <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
              Password
            </label>
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
            className="btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In with Password'}
          </button>
        </form>
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
