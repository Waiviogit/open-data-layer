'use server';

import { cookies } from 'next/headers';

import { matchLocale } from '../domain/resolve-locale';
import type { LocaleId } from '../types';

const APP_LOCALE_COOKIE = 'app_locale';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function getCookieLocale(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(APP_LOCALE_COOKIE)?.value;
  return raw ?? null;
}

export async function setCookieLocale(locale: LocaleId): Promise<void> {
  const resolved = matchLocale(locale);
  if (!resolved) {
    return;
  }
  const store = await cookies();
  store.set(APP_LOCALE_COOKIE, resolved, {
    path: '/',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}
