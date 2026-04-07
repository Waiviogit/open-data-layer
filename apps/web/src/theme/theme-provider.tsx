'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

/** Avoids SSR warnings for `useLayoutEffect` while applying theme before paint on the client. */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

import { setThemePreference } from './actions';
import type { ThemeId, ThemePreference, ThemeResolution } from './types';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ThemeId;
  source: ThemeResolution['source'];
  setPreference: (next: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialResolution,
}: {
  children: React.ReactNode;
  initialResolution: ThemeResolution;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initialResolution.preference,
  );
  const [resolvedTheme, setResolvedTheme] = useState<ThemeId>(
    initialResolution.resolvedTheme,
  );
  const [source, setSource] = useState<ThemeResolution['source']>(
    initialResolution.source,
  );

  useIsomorphicLayoutEffect(() => {
    if (preference !== 'system') {
      document.documentElement.dataset.theme = preference;
      setResolvedTheme(preference);
      return;
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next: ThemeId = mq.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setResolvedTheme(next);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    const previous = preference;
    setPreferenceState(next);

    const res = await setThemePreference(next);

    if (!res.ok) {
      setPreferenceState(previous);
      return;
    }

    setSource('cookie');
  }, [preference]);

  const value = useMemo(
    (): ThemeContextValue => ({
      preference,
      resolvedTheme,
      source,
      setPreference,
    }),
    [preference, resolvedTheme, source, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return ctx;
}
