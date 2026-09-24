'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useTransition,
  type ReactNode,
} from 'react';

import { pushInstantUrl, replaceInstantUrl } from './instant-url';
import { parseNavHref, type NavTarget } from './nav-target';
import { rememberScrollForCurrentEntry } from './scroll-memory';

export type NavigateInstantOptions = {
  href: string;
  method?: 'push' | 'replace';
  scroll?: boolean;
  /** Called synchronously before URL update (e.g. set optimistic pending target). */
  onPending?: (target: NavTarget) => void;
};

type InstantNavigationValue = {
  navigateInstant: (options: NavigateInstantOptions) => void;
  isNavigating: boolean;
};

const InstantNavigationContext = createContext<InstantNavigationValue | null>(null);

function useInstantNavigationImpl(): InstantNavigationValue {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();

  const navigateInstant = useCallback(
    ({ href, method = 'push', scroll = false, onPending }: NavigateInstantOptions) => {
      const target = parseNavHref(href);
      onPending?.(target);

      if (method === 'replace') {
        replaceInstantUrl(href);
      } else {
        rememberScrollForCurrentEntry();
        pushInstantUrl(href);
      }

      startTransition(() => {
        if (method === 'replace') {
          router.replace(href, { scroll });
        } else {
          router.push(href, { scroll });
        }
      });
    },
    [router],
  );

  return { navigateInstant, isNavigating };
}

/** Shares one navigation transition across tab sidebars and feed content. */
export function InstantNavigationProvider({ children }: { children: ReactNode }) {
  const value = useInstantNavigationImpl();
  return (
    <InstantNavigationContext.Provider value={value}>
      {children}
    </InstantNavigationContext.Provider>
  );
}

export function useInstantNavigation(): InstantNavigationValue {
  const shared = useContext(InstantNavigationContext);
  const local = useInstantNavigationImpl();
  return shared ?? local;
}
