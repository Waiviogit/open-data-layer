'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { locales } from '../config/locales';
import { useI18n } from '../providers/i18n-provider';
import { setCookieLocale } from '../runtime/cookies';
import type { LocaleId } from '../types';

export function LocaleSwitcher() {
  const { locale: current } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: LocaleId) {
    if (next === current) {
      return;
    }
    startTransition(async () => {
      await setCookieLocale(next);
      router.refresh();
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">Language</span>
      <select
        aria-busy={pending}
        disabled={pending}
        value={current}
        onChange={(e) => onChange(e.target.value as LocaleId)}
      >
        {locales.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
