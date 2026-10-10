import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { TopBar } from '@/components/TopBar';
import { QueryProvider } from '@/components/QueryProvider';
import { CommandPalette } from '@/components/CommandPalette';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'VeriLoop — The AI engineer that tests your AI engineer',
  description:
    'Find why AI agents fail. Test targeted fixes. Prove they generalize. VeriLoop is an autonomous reliability engineer for AI agents.',
  keywords: ['AI agent testing', 'reliability engineering', 'agent evaluation', 'Nebius', 'NVIDIA'],
};

import { AmbientEnergyBackdrop } from '@/components/AmbientEnergyBackdrop';

import { AppShell } from '@/components/AppShell';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-t="dark" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ backgroundColor: 'transparent', minHeight: '100vh', overflowX: 'hidden' }}>
        <QueryProvider>
          {/* Slow domain-warped plasma smoke in brand cyan drawn once behind every page */}
          <AmbientEnergyBackdrop />

          <AppShell>{children}</AppShell>
          <CommandPalette />
        </QueryProvider>
      </body>
    </html>
  );
}
