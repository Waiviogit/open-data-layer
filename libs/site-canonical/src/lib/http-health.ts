import { isIPv4, isIPv6 } from 'node:net';
import { isAllowedPublicHttpsUrl } from './ssrf-guard';
import { isHostnameSafeAfterRedirect, normalizeWebsiteToHttpsUrl } from './normalize-website';

const REDIRECT = new Set([301, 302, 303, 307, 308]);

export type HealthCheckResult =
  | {
      ok: true;
      finalUrl: string;
      status: number;
    }
  | {
      ok: false;
      reason: string;
      status?: number;
    };

const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 4_000;

/**
 * GET with manual redirects, cap 5, timeout 3–5s, success 200–399 on final response.
 * Final URL must remain https, host allowed, not private IP in URL string.
 */
function mergeAbortSignals(
  local: AbortController,
  outer?: AbortSignal,
): AbortSignal {
  if (!outer) {
    return local.signal;
  }
  if (outer.aborted) {
    local.abort();
    return local.signal;
  }
  const onOuter = () => {
    local.abort();
  };
  outer.addEventListener('abort', onOuter, { once: true });
  return local.signal;
}

export async function checkUrlHealth(
  startUrl: string,
  options?: {
    maxRedirects?: number;
    timeoutMs?: number;
    fetchFn?: typeof fetch;
    /** When aborted (e.g. job timeout), the request is cancelled. */
    signal?: AbortSignal;
  },
): Promise<HealthCheckResult> {
  const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = options?.fetchFn ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    return { ok: false, reason: 'no_fetch' };
  }
  if (options?.signal?.aborted) {
    return { ok: false, reason: 'aborted' };
  }
  const norm = normalizeWebsiteToHttpsUrl(startUrl);
  if (!norm) {
    return { ok: false, reason: 'bad_url' };
  }
  let current = norm;
  for (let i = 0; i <= maxRedirects; i += 1) {
    const u = new URL(current);
    const g = isAllowedPublicHttpsUrl(u);
    if (!g.ok) {
      return { ok: false, reason: g.reason ?? 'blocked' };
    }
    if (isIPv4(u.hostname) || isIPv6(u.hostname)) {
      if (!isHostnameSafeAfterRedirect(u.hostname)) {
        return { ok: false, reason: 'bad_ip' };
      }
    }
    const ac = new AbortController();
    const t = setTimeout(() => {
      ac.abort();
    }, timeoutMs);
    const requestSignal = mergeAbortSignals(ac, options?.signal);
    let res: Response;
    try {
      res = await fetchFn(u.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: requestSignal,
      });
    } catch (e) {
      clearTimeout(t);
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, reason: `net:${m}` };
    } finally {
      clearTimeout(t);
    }
    if (REDIRECT.has(res.status)) {
      const loc = res.headers.get('location');
      if (!loc || i === maxRedirects) {
        return { ok: false, reason: 'redirect_limit_or_missing_location', status: res.status };
      }
      current = new URL(loc, u).toString();
      const n2 = normalizeWebsiteToHttpsUrl(current);
      if (!n2) {
        return { ok: false, reason: 'bad_redirect_target' };
      }
      current = n2;
      continue;
    }
    if (res.status >= 200 && res.status < 400) {
      return { ok: true, finalUrl: u.toString(), status: res.status };
    }
    if (res.status >= 500) {
      return { ok: false, reason: 'server_5xx', status: res.status };
    }
    return { ok: false, reason: 'bad_status', status: res.status };
  }
  return { ok: false, reason: 'redirect_exhausted' };
}
