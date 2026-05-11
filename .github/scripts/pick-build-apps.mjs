#!/usr/bin/env node
/**
 * Used by GitHub Actions build-images workflow when APPS_EXPLICIT is set.
 * Prints JSON array of app names or exits:
 * - 0 + stdout JSON — use this matrix
 * - 2 — no explicit list (caller falls back to Nx affected / rebuild all)
 */
const explicit = (process.env.APPS_EXPLICIT || '').trim();

const ALLOWED = new Set([
  'chain-indexer',
  'query-api',
  'auth-api',
  'notifications',
  'scheduler',
  'ipfs-gateway',
  'stack-watchdog',
  'web',
  'migrator',
]);

if (!explicit) {
  process.exit(2);
}

const parts = explicit.split(',').map((s) => s.trim()).filter(Boolean);
const unknown = parts.filter((p) => !ALLOWED.has(p));

if (unknown.length) {
  console.error(`Unknown or disallowed app names: ${unknown.join(', ')}`);
  console.error(`Allowed: ${[...ALLOWED].sort().join(', ')}`);
  process.exit(1);
}

const out = [...new Set(parts)];
if (out.length === 0) {
  console.error('Explicit apps list is empty after parsing');
  process.exit(1);
}

process.stdout.write(JSON.stringify(out));
