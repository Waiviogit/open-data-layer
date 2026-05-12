'use strict';

/**
 * CI / local guard: message catalogs under apps/web must be strict UTF-8 (no BOM)
 * and valid JSON. Node's default `readFile(..., 'utf8')` can substitute invalid bytes;
 * this uses TextDecoder({ fatal: true }) on raw bytes.
 *
 * Usage (repo root):
 *   node scripts/verify-web-locale-json-utf8.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(
  ROOT,
  'apps',
  'web',
  'src',
  'i18n',
  'locales',
);

function verifyFile(absPath, relLabel) {
  const buf = fs.readFileSync(absPath);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    throw new Error(`${relLabel}: UTF-8 BOM is not allowed (use BOM-free UTF-8)`);
  }
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const text = decoder.decode(buf);
  try {
    JSON.parse(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${relLabel}: invalid JSON (${msg})`);
  }
}

function main() {
  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`Missing locales directory: ${LOCALES_DIR}`);
    process.exit(1);
  }
  const entries = fs
    .readdirSync(LOCALES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (entries.length === 0) {
    console.error(`No *.json catalogs in ${LOCALES_DIR}`);
    process.exit(1);
  }
  for (const name of entries) {
    const absPath = path.join(LOCALES_DIR, name);
    const relLabel = path.relative(ROOT, absPath).split(path.sep).join('/');
    verifyFile(absPath, relLabel);
  }
  console.log(
    `OK: ${entries.length} locale JSON files are strict UTF-8 (no BOM) and parse as JSON.`,
  );
}

main();
