export type RedisPurpose = 'cache' | 'lock' | 'session' | 'queue';

/**
 * Builds a namespaced Redis key: `{app}:{purpose}:{segment}...`
 * App-specific names belong in the app layer; this helper stays generic.
 */
export function buildRedisKey(
  app: string,
  purpose: RedisPurpose,
  ...segments: (string | number)[]
): string {
  return [app, purpose, ...segments.map(String)].join(':');
}
