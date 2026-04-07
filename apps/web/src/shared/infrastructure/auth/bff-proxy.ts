import 'server-only';

import { env } from '@/config/env';

export function getAuthApiBaseUrl(): string {
  return env.AUTH_API_BASE_URL.replace(/\/$/, '');
}

/** Path under auth-api `/auth/v1` (global prefix `auth`, version `v1`). */
export function authApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getAuthApiBaseUrl()}/auth/v1${p}`;
}
