'use client';

import React, { useState, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { TopBar } from '@/components/TopBar';

interface NavContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
}

export const NavContext = createContext<NavContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
  close: () => {},
});

export const useNav = () => useContext(NavContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

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

  // App Layout with responsive sidebar navigation and top bar
  return (
    <NavContext.Provider value={{ isOpen, setIsOpen, toggle, close }}>
      <div
        id="root"
        className="flex min-h-screen relative z-10 w-full overflow-x-hidden"
        style={{ backgroundColor: 'transparent' }}
      >
        <Navigation />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen w-full">
          <TopBar />
          <main className="flex-1 w-full min-w-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </NavContext.Provider>
  );
}
