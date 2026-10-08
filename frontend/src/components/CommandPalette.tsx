'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Layers, Activity, Bug, FlaskConical, Search, ShieldCheck, FileText, Settings, Sparkles } from 'lucide-react';

interface CommandItem {
  title: string;
  category: string;
  href?: string;
  action?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      title: 'Run Evaluation',
      category: 'Actions',
      action: () => {
        router.push('/dashboard');
      },
      icon: Play,
    },
    {
      title: 'Open Home Page',
      category: 'Navigation',
      href: '/',
      icon: Sparkles,
    },
    {
      title: 'Open Dashboard',
      category: 'Navigation',
      href: '/dashboard',
      icon: Activity,
    },
    {
      title: 'Open Agent Fleet',
      category: 'Navigation',
      href: '/agents',
      icon: Layers,
    },
    {
      title: 'Open Evaluation Runs History',
      category: 'Navigation',
      href: '/evaluations',
      icon: Activity,
    },
    {
      title: 'Open Diagnosed Failures',
      category: 'Navigation',
      href: '/failures',
      icon: Bug,
    },
    {
      title: 'Open Experiment Lab',
      category: 'Navigation',
      href: '/experiments',
      icon: FlaskConical,
    },
    {
      title: 'Open Tavily Evidence',
      category: 'Navigation',
      href: '/evidence',
      icon: Search,
    },
    {
      title: 'Open Regression Firewall',
      category: 'Navigation',
      href: '/regression',
      icon: ShieldCheck,
    },
    {
      title: 'Open Verification Reports',
      category: 'Navigation',
      href: '/reports',
      icon: FileText,
    },
    {
      title: 'Open Settings & Architecture',
      category: 'Navigation',
      href: '/settings',
      icon: Settings,
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const openPalette = () => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    dialogRef.current?.showModal();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closePalette = () => {
    setIsOpen(false);
    dialogRef.current?.close();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialogRef.current?.open) {
          closePalette();
        } else {
          openPalette();
        }
      }
      if (e.key === 'Escape' && dialogRef.current?.open) {
        closePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const executeItem = (item: CommandItem) => {
    closePalette();
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <>
      <dialog
        id="pal"
        ref={dialogRef}
        aria-label="Command palette"
        onClick={(e) => {
          if (e.target === dialogRef.current) closePalette();
        }}
      >
        <input
          ref={inputRef}
          id="pq"
          placeholder="Search pages and actions (e.g. Dashboard, Experiments)..."
          aria-label="Search command palette"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered[selectedIndex]) {
                executeItem(filtered[selectedIndex]);
              }
            }
          }}
        />
        <div id="pl">
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--mu)', fontSize: '13px' }}>
              No matching commands
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  className={`c ${idx === selectedIndex ? 'bg-[var(--s2)] text-[var(--cy)]' : ''}`}
                  onClick={() => executeItem(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '11px 16px',
                  }}
                >
                  {Icon && <Icon size={14} className="text-[var(--mu)]" />}
                  <span style={{ flex: 1 }}>{item.title}</span>
                  <span className="mono mu" style={{ fontSize: '11px' }}>
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </dialog>
    </>
  );
}
