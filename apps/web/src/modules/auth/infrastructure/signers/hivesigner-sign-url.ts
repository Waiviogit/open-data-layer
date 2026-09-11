export const HIVESIGNER_SIGN_BASE = 'https://hivesigner.com';

/**
 * HiveSigner `/sign/{op}` query values: scalars as-is, objects/arrays as JSON.
 * `hivesigner.sign()` stringifies objects via ToString (`[object Object]`) and
 * arrays via join (`a,b`), which HiveSigner cannot deserialize.
 */
export function encodeHiveSignerQueryValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (value == null) {
    return '';
  }
  return JSON.stringify(value);
}

export function buildHiveSignerSignUrl(
  opName: string,
  params: Record<string, unknown>,
  redirectUri: string,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    query.set(key, encodeHiveSignerQueryValue(value));
  }
  query.set('redirect_uri', redirectUri);
  return `${HIVESIGNER_SIGN_BASE}/sign/${opName}?${query.toString()}`;
}
