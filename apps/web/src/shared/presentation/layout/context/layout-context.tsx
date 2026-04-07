'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type ContentArrangement = 'feed' | 'grid' | 'masonry';

export type LayoutContextValue = {
  leftNavOpen: boolean;
  toggleLeftNav: () => void;
  rightRailOpen: boolean;
  toggleRightRail: () => void;
  contentArrangement: ContentArrangement;
  setContentArrangement: (mode: ContentArrangement) => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [leftNavOpen, setLeftNavOpen] = useState(false);
  const [rightRailOpen, setRightRailOpen] = useState(false);
  const [contentArrangement, setContentArrangement] =
    useState<ContentArrangement>('feed');

  const toggleLeftNav = useCallback(() => {
    setLeftNavOpen((v) => !v);
  }, []);

  const toggleRightRail = useCallback(() => {
    setRightRailOpen((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      leftNavOpen,
      toggleLeftNav,
      rightRailOpen,
      toggleRightRail,
      contentArrangement,
      setContentArrangement,
    }),
    [
      leftNavOpen,
      toggleLeftNav,
      rightRailOpen,
      toggleRightRail,
      contentArrangement,
    ],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayoutContext(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayoutContext must be used within LayoutProvider');
  }
  return ctx;
}
