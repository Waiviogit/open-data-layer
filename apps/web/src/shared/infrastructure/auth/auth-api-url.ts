/**
 * auth-api URL helpers safe for Edge (proxy) and Node (route handlers).
 * Do not import `server-only` modules from here.
 */
export function getAuthApiBaseUrlFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = env.AUTH_API_BASE_URL?.trim();
  return (raw ? raw : 'http://localhost:7100').replace(/\/$/, '');
}

/** Path under auth-api `/auth/v1` (global prefix `auth`, version `v1`). */
export function buildAuthApiUrl(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getAuthApiBaseUrlFromEnv(env)}/auth/v1${p}`;
}
