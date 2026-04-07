/**
 * Parses a small subset of duration strings (e.g. `15m`, `7d`, `24h`) to milliseconds.
 */
export function parseDurationToMs(input: string): number {
  const s = input.trim();
  const m = /^(\d+)([smhd])$/i.exec(s);
  if (!m) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const unitMs =
    u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 86_400_000;
  return n * unitMs;
}
