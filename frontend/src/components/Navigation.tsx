'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Sparkles,
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
    <aside aria-label="Primary" style={{ width: '248px', flexShrink: 0, userSelect: 'none' }}>
      {/* Brand & Logo - Clicking opens Home Page */}
      <Link href="/" className="brand" title="Open VeriLoop Home Page" style={{ color: 'var(--tx)', cursor: 'pointer' }}>
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

      {/* Nav Groups */}
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

      {/* Footer: Workspace indicator */}
      <div className="ws">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Demo workspace</b>
          <Link
            href="/login"
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
  );
}
