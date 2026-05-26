import type { RedisOptions } from 'ioredis';

/**
 * Parse a Redis connection URI into ioredis options using the WHATWG URL API.
 * Avoids ioredis `parseURL()` which uses deprecated Node `url.parse()` (DEP0169 on Node 24+).
 */
export function parseRedisUri(uri: string): RedisOptions {
  if (/^\d+$/.test(uri)) {
    return { port: Number.parseInt(uri, 10) };
  }

  let normalized = uri;
  if (
    !normalized.includes('://') &&
    !normalized.startsWith('/') &&
    !normalized.startsWith('redis://') &&
    !normalized.startsWith('rediss://')
  ) {
    normalized = `redis://${normalized}`;
  }

  const isTls = normalized.startsWith('rediss://');
  const parsed = new URL(normalized);
  const options: RedisOptions = {};

  if (parsed.protocol === 'redis:' || parsed.protocol === 'rediss:') {
    if (parsed.pathname.length > 1) {
      options.db = Number.parseInt(parsed.pathname.slice(1), 10);
    }
  } else if (parsed.pathname) {
    options.path = parsed.pathname;
  }

  if (parsed.hostname) {
    options.host = parsed.hostname.replace(/^\[|\]$/g, '');
  }

  if (parsed.port) {
    options.port = Number.parseInt(parsed.port, 10);
  }

  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  if (username) {
    options.username = username;
  }
  if (password) {
    options.password = password;
  }

  const family = parsed.searchParams.get('family');
  if (family !== null) {
    const parsedFamily = Number.parseInt(family, 10);
    if (!Number.isNaN(parsedFamily)) {
      options.family = parsedFamily;
    }
  }

  if (isTls) {
    options.tls = {};
  }

  return options;
}
