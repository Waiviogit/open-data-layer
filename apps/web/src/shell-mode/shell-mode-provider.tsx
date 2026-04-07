'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ShellModeId, ShellModePreference, ShellModeResolution } from './types';

type ShellModeContextValue = {
  preference: ShellModePreference;
  resolvedMode: ShellModeId;
  source: ShellModeResolution['source'];
  setPreference: (next: ShellModePreference) => Promise<void>;
};

const ShellModeContext = createContext<ShellModeContextValue | null>(null);

export function ShellModeProvider({
  children,
  initialResolution,
}: {
  children: React.ReactNode;
  initialResolution: ShellModeResolution;
}) {
  const [preference, setPreferenceState] = useState<ShellModePreference>(
    initialResolution.preference,
  );
  const [resolvedMode, setResolvedMode] = useState<ShellModeId>(
    initialResolution.resolvedMode,
  );
  const [source, setSource] = useState<ShellModeResolution['source']>(
    initialResolution.source,
  );

  useEffect(() => {
    document.documentElement.dataset.shellMode = resolvedMode;
  }, [resolvedMode]);

  const setPreference = useCallback(async (next: ShellModePreference) => {
    const previous = preference;
    setPreferenceState(next);
    setResolvedMode(next);

    const res = await fetch('/api/shell-mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preference: next }),
    });

    if (!res.ok) {
      setPreferenceState(previous);
      setResolvedMode(previous);
      return;
    }

    setSource('cookie');
  }, [preference]);

  const value = useMemo(
    (): ShellModeContextValue => ({
      preference,
      resolvedMode,
      source,
      setPreference,
    }),
    [preference, resolvedMode, source, setPreference],
  );

  return (
    <ShellModeContext.Provider value={value}>
      {children}
    </ShellModeContext.Provider>
  );
}

export function useShellModeContext(): ShellModeContextValue {
  const ctx = useContext(ShellModeContext);
  if (!ctx) {
    throw new Error('useShellModeContext must be used within ShellModeProvider');
  }
  return ctx;
}
