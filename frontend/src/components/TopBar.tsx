'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { Play, RotateCcw, Search, Menu } from 'lucide-react';
import { useNav } from '@/components/AppShell';

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
  const { toggle } = useNav();
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
      {/* Mobile Menu Hamburger Button */}
      <button
        id="btn-nav-toggle"
        onClick={toggle}
        className="lg:hidden p-1.5 -ml-1 mr-1 rounded text-[var(--tx)] hover:bg-[var(--s2)] transition-colors inline-flex items-center justify-center cursor-pointer"
        aria-label="Open navigation menu"
        title="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      <span className="mu hidden sm:inline" style={{ fontSize: '13px' }}>
        Customer Support Agent&nbsp;›&nbsp;
      </span>
      <span className="t truncate max-w-[120px] sm:max-w-none">{title}</span>

      <span className="sp" />

      <span className="bd hidden md:inline-flex">
        <i style={{ color: 'var(--am)' }}></i>DEMO BASELINE
      </span>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="btn sm btn-reset"
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
        <span className="mono mu hidden lg:inline" style={{ fontSize: '10.5px' }}>⌘K</span>
      </button>

      <button
        onClick={handleRunEvaluation}
        disabled={isRunning}
        className="btn p whitespace-nowrap"
        style={{ padding: '6px 12px', fontSize: '12.5px' }}
      >
        <Play size={12} fill="currentColor" />
        <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Run Evaluation'}</span>
        <span className="sm:hidden">{isRunning ? '...' : 'Run'}</span>
      </button>
    </header>
  );
}
