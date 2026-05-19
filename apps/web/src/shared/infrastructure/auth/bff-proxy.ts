import 'server-only';

import {
  buildAuthApiUrl,
  getAuthApiBaseUrlFromEnv,
} from './auth-api-url';

export function getAuthApiBaseUrl(): string {
  return getAuthApiBaseUrlFromEnv(process.env);
}

/** Path under auth-api `/auth/v1` (global prefix `auth`, version `v1`). */
export function authApiUrl(path: string): string {
  return buildAuthApiUrl(path, process.env);
}
