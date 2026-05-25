const INTERNAL_HOSTS = new Set(['0.0.0.0', '127.0.0.1', '::1']);

function firstHeaderValue(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.split(',')[0]?.trim() ?? null;
}

function isInternalHost(host: string): boolean {
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return INTERNAL_HOSTS.has(hostname);
}

function originFromHost(host: string, proto: string): string | null {
  if (!host || isInternalHost(host)) {
    return null;
  }
  return `${proto}://${host}`;
}

/**
 * Public browser origin for redirects behind reverse proxies / Docker.
 * Prefers configured origin, then forwarded headers, then request URL.
 */
export function getPublicOrigin(
  req: Request,
  configuredOrigin?: string | null,
): string {
  const configured = configuredOrigin?.trim().replace(/\/$/, '');
  if (configured) {
    return configured;
  }

  const forwardedHost = firstHeaderValue(req.headers.get('x-forwarded-host'));
  const host = forwardedHost ?? firstHeaderValue(req.headers.get('host'));
  const proto =
    firstHeaderValue(req.headers.get('x-forwarded-proto')) ?? 'http';

  const fromHeaders = host ? originFromHost(host, proto) : null;
  if (fromHeaders) {
    return fromHeaders;
  }

  const requestUrl = new URL(req.url);
  if (!isInternalHost(requestUrl.host)) {
    return requestUrl.origin;
  }

  return 'http://localhost:3000';
}

export function buildPublicUrl(
  req: Request,
  pathname: string,
  configuredOrigin?: string | null,
): URL {
  return new URL(pathname, getPublicOrigin(req, configuredOrigin));
}
