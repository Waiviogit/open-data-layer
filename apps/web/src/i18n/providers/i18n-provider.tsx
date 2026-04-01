'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import { isRTL as localeIsRTL } from '../domain/is-rtl';
import type { LocaleId, Messages } from '../types';

export type I18nContextValue = {
  locale: LocaleId;
  t: (key: string) => string;
  isRTL: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export type I18nProviderProps = {
  locale: LocaleId;
  messages: Messages;
  children: ReactNode;
};

export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  const t = useCallback(
    (key: string) => messages[key] ?? key,
    [messages],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t,
      isRTL: localeIsRTL(locale),
    }),
    [locale, t],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
