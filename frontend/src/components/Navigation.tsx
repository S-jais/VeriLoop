'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNav } from '@/components/AppShell';
import {
  LayoutDashboard,
  Bot,
  Activity,
  Bug,
  FlaskConical,
  Search,
  ShieldCheck,
  FileText,
  Settings,
  X,
} from 'lucide-react';

interface NavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'ENGINEERING',
    items: [
      { href: '/agents', label: 'Agents', icon: Bot },
      { href: '/evaluations', label: 'Evaluations', icon: Activity },
      { href: '/failures', label: 'Failures', icon: Bug },
      { href: '/experiments', label: 'Experiments', icon: FlaskConical },
    ],
  },
  {
    label: 'VERIFICATION',
    items: [
      { href: '/evidence', label: 'Evidence', icon: Search },
      { href: '/regression', label: 'Regression Firewall', icon: ShieldCheck },
      { href: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Navigation() {
  const pathname = usePathname();
  const { isOpen, close } = useNav();

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  // If on full-bleed landing / home or auth pages, hide sidebar
  if (
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/login' ||
    pathname === '/signup'
  ) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer Navigation */}
      <aside
        aria-label="Primary"
        className={`aside-nav ${isOpen ? 'open' : ''}`}
        style={{ userSelect: 'none' }}
      >
        {/* Brand Header with Close button for mobile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 8px 12px' }}>
          <Link
            href="/"
            onClick={close}
            className="brand"
            title="Open VeriLoop Home Page"
            style={{ color: 'var(--tx)', cursor: 'pointer', padding: 0 }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '38px',
                height: '38px',
                background: 'var(--cy)',
                borderRadius: '3px',
                flex: 'none',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M16 4a12 12 0 1 0 11 7.4"
                  fill="none"
                  stroke="#04161A"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M10.5 16.5l4 4 8-9"
                  fill="none"
                  stroke="#04161A"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <span>VERILOOP</span>
              <small>RELIABILITY ENGINEERING</small>
            </div>
          </Link>

          <button
            id="btn-nav-close"
            onClick={close}
            className="lg:hidden p-1.5 rounded text-[var(--mu)] hover:text-[var(--tx)] hover:bg-[var(--s2)] transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {NAV_GROUPS.map((group) => (
            <React.Fragment key={group.label}>
              <div className="grp">{group.label}</div>
              {group.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={isActive ? 'page' : undefined}
                    className={isActive ? 'active' : ''}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Footer: Workspace indicator */}
        <div className="ws">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>Demo workspace</b>
            <Link
              href="/login"
              onClick={close}
              style={{ fontSize: '11.5px', color: 'var(--mu)', textDecoration: 'none' }}
              title="Switch Account / Sign in"
            >
              Sign out
            </Link>
          </div>
          <div style={{ marginTop: '4px' }}>
            <span className="bd">
              <i></i>
              Environment: local
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
