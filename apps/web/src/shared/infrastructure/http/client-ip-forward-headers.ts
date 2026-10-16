/**
 * Copy incoming X-Forwarded-For verbatim for query-api.
 * Do not parse hops, do not append this host, do not read x-real-ip.
 */
export function getClientIpForwardHeaders(incoming: {
  get(name: string): string | null;
}): Record<string, string> {
  const xff = incoming.get('x-forwarded-for');
  if (xff == null || xff.trim() === '') {
    return {};
  }
  return { 'X-Forwarded-For': xff };
}

export function mergeForwardClientIpInit(
  fetchInit: RequestInit,
  forwardClientIp: boolean | undefined,
  extra: Record<string, string>,
): RequestInit {
  if (forwardClientIp !== true || Object.keys(extra).length === 0) {
    return fetchInit;
  }
  const headers = new Headers(fetchInit.headers);
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value);
  }
  return { ...fetchInit, headers };
}
