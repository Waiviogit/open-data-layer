/** Safe JSON-LD payload for inline script tags (escapes `<` to prevent breakout). */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
