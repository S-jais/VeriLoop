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
  const [mounted, setMounted] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
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

  const effectiveLive = mounted ? isLive : false;

  return {
    isLive: effectiveLive,
    label: effectiveLive ? 'Live' : 'Sample run',
    sublabel: effectiveLive
      ? 'Connected to live backend session'
      : 'Cached baseline run (2026-10-11 16:00 UTC)',
    badgeClass: effectiveLive ? 'ok' : 'in',
  };
}
