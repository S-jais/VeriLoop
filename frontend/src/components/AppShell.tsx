'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { TopBar } from '@/components/TopBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreen =
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/login' ||
    pathname === '/signup';

  if (isFullScreen) {
    // Full screen Home Page without sidebar, topbar, or main constraints
    return (
      <div id="root" className="min-h-screen relative z-10 w-full" style={{ backgroundColor: 'transparent' }}>
        {children}
      </div>
    );
  }

  // App Layout with sidebar navigation and top bar
  return (
    <div
      id="root"
      className="flex min-h-screen relative z-10 w-full"
      style={{ backgroundColor: 'transparent' }}
    >
      <Navigation />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
