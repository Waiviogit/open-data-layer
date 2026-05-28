'use client';

import {
  ODL_HS_TOKEN_COOKIE,
  ODL_HS_TOKEN_STORAGE_KEY,
} from './hivesigner-token.constants';
import { ODL_WALLET_PROVIDER_SESSION_KEY } from './wallet-facade.client';

export { ODL_HS_TOKEN_COOKIE, ODL_HS_TOKEN_STORAGE_KEY };

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
}

export function getHivesignerToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const token = localStorage.getItem(ODL_HS_TOKEN_STORAGE_KEY)?.trim();
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function clearHivesignerToken(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(ODL_HS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ODL_WALLET_PROVIDER_SESSION_KEY);
  } catch {
    // ignore quota / private mode
  }
}

/** Move short-lived OAuth token from cookie (set by BFF callback) into localStorage. */
export function hydrateHivesignerTokenFromCookie(): boolean {
  const token = readCookie(ODL_HS_TOKEN_COOKIE);
  if (!token) {
    return false;
  }
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    localStorage.setItem(ODL_HS_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(ODL_WALLET_PROVIDER_SESSION_KEY, 'hivesigner');
  } catch {
    return false;
  }
  clearCookie(ODL_HS_TOKEN_COOKIE);
  return true;
}
