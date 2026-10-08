'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { Play, RotateCcw, Search } from 'lucide-react';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agents': 'Agents',
  '/evaluations': 'Evaluations',
  '/failures': 'Failures',
  '/experiments': 'Experiments',
  '/evidence': 'Evidence',
  '/regression': 'Regression Firewall',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [demoData, setDemoData] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // If on landing / home / auth pages, hide TopBar
  if (
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/login' ||
    pathname === '/signup'
  ) {
    return null;
  }

  const title = TITLES[pathname] || 'Dashboard';

  const handleReset = async () => {
    if (!confirm('Reset demo agent to clean baseline? This clears candidate versions.')) return;
    setResetting(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/demo/reset');
      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setResetting(false);
    }
  };

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    try {
      if (pathname !== '/dashboard') {
        router.push('/dashboard');
      }
      await axios.post('http://127.0.0.1:8000/api/evaluations', {
        agent_id: 'demo-customer-support-agent-v1',
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const openPalette = () => {
    const pal = document.getElementById('pal') as HTMLDialogElement | null;
    pal?.showModal();
    const pq = document.getElementById('pq') as HTMLInputElement | null;
    pq?.focus();
  };

  return (
    <header className="tb">
      <span className="mu hidden sm:inline" style={{ fontSize: '13px' }}>
        Customer Support Agent&nbsp;›&nbsp;
      </span>
      <span className="t">{title}</span>

      <span className="sp" />

      <span className="bd hidden md:inline-flex">
        <i style={{ color: 'var(--am)' }}></i>DEMO BASELINE
      </span>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="btn sm"
        title="Reset demo baseline"
        aria-label="Reset demo"
        style={{ padding: '6px 10px', fontSize: '12px' }}
      >
        <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
        <span className="hidden lg:inline">↺ Reset</span>
      </button>

      <label
        className="hidden md:flex fl mu"
        style={{ cursor: 'pointer', fontSize: '12.5px', userSelect: 'none', gap: '6px' }}
      >
        <input
          type="checkbox"
          checked={demoData}
          onChange={(e) => setDemoData(e.target.checked)}
          aria-label="Demo data toggle"
        />
        <span>Demo data</span>
      </label>

      <button
        onClick={openPalette}
        className="btn sm"
        title="Search pages and actions (⌘K)"
        style={{ padding: '6px 10px', fontSize: '12px' }}
      >
        <Search size={12} className="mu" />
        <span className="hidden sm:inline">Search</span>
        <span className="mono mu" style={{ fontSize: '10.5px' }}>⌘K</span>
      </button>

      <button
        onClick={handleRunEvaluation}
        disabled={isRunning}
        className="btn p"
      >
        <Play size={13} fill="currentColor" />
        <span>{isRunning ? 'Running...' : 'Run Evaluation'}</span>
      </button>
    </header>
  );
}
