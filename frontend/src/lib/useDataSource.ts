'use client';

import { useState, useEffect } from 'react';
import { isSessionLive, subscribeSessionLive } from '@/lib/api';

export interface DataSourceState {
  isLive: boolean;
  label: 'Live' | 'Sample run';
  sublabel: string;
  badgeClass: 'ok' | 'in';
}

export function useDataSource(): DataSourceState {
  const [isLive, setIsLive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return isSessionLive();
    }
    return false;
  });

  useEffect(() => {
    // Sync on mount
    setIsLive(isSessionLive());

    const unsubscribe = subscribeSessionLive((live) => {
      setIsLive(live);
    });

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ isLive: boolean }>;
      if (custom.detail?.isLive !== undefined) {
        setIsLive(custom.detail.isLive);
      }
    };

    window.addEventListener('veriloop:data-source-change', handleCustomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('veriloop:data-source-change', handleCustomEvent);
    };
  }, []);

  return {
    isLive,
    label: isLive ? 'Live' : 'Sample run',
    sublabel: isLive
      ? 'Connected to live backend session'
      : 'Cached baseline run (2026-10-11 16:00 UTC)',
    badgeClass: isLive ? 'ok' : 'in',
  };
}
