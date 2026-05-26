'use strict';

/**
 * Ensures apps/<app>/package.json lists every npm package that webpack leaves as
 * external `require("…")` in dist/apps/<app>/main.js. Docker builder stages run
 * `pnpm deploy --legacy --prod` from that manifest — missing deps cause MODULE_NOT_FOUND at runtime.
 *
 * Usage (after nx build):
 *   node scripts/check-bundle-deps.cjs
 *   node scripts/check-bundle-deps.cjs --app chain-indexer
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** NestJS apps built with webpack + pnpm deploy Docker pattern */
const WEBPACK_APPS = [
  'query-api',
  'auth-api',
  'chain-indexer',
  'notifications',
  'scheduler',
  'ipfs-gateway',
  'stack-watchdog',
];

function npmPackageName(spec) {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.slice(0, 2).join('/');
  }
  return spec.split('/')[0];
}

function extractExternalPackages(mainJsPath) {
  const content = fs.readFileSync(mainJsPath, 'utf8');
  const re = /require\("([^"]+)"\)/g;
  const packages = new Set();
  let m;
  while ((m = re.exec(content))) {
    const spec = m[1];
    if (spec.startsWith('node:')) continue;
    if (spec === 'crypto') continue;
    packages.add(npmPackageName(spec));
  }
  return packages;
}

function declaredDependencyKeys(pkgJsonPath) {
  const j = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  return new Set([
    ...Object.keys(j.dependencies || {}),
    ...Object.keys(j.optionalDependencies || {}),
  ]);
}

function checkApp(app) {
  const mainJs = path.join(ROOT, 'dist', 'apps', app, 'main.js');
  const pkgJson = path.join(ROOT, 'apps', app, 'package.json');
  if (!fs.existsSync(mainJs)) {
    console.error(`check-bundle-deps: missing ${mainJs} — run nx build first`);
    return false;
  }
  if (!fs.existsSync(pkgJson)) {
    console.error(`check-bundle-deps: missing ${pkgJson}`);
    return false;
  }
  const required = extractExternalPackages(mainJs);
  const declared = declaredDependencyKeys(pkgJson);
  let ok = true;
  for (const pkg of required) {
    if (!declared.has(pkg)) {
      console.error(
        `check-bundle-deps: "${app}" bundle requires "${pkg}" but it is not in apps/${app}/package.json dependencies.`,
      );
      ok = false;
    }
  }
  return ok;
}

function main() {
  const argv = process.argv.slice(2);
  let apps = [...WEBPACK_APPS];
  const appIdx = argv.indexOf('--app');
  if (appIdx !== -1 && argv[appIdx + 1]) {
    apps = [argv[appIdx + 1]];
  }
  let allOk = true;
  for (const app of apps) {
    if (!WEBPACK_APPS.includes(app)) {
      console.warn(`check-bundle-deps: skip unknown app "${app}"`);
      continue;
    }
    if (!checkApp(app)) allOk = false;
  }
  if (!allOk) {
    console.error(
      '\ncheck-bundle-deps: Fix: pnpm add <pkg> --filter @opden-data-layer/<app> , then nx build.\n',
    );
    process.exit(1);
  }
  console.log('check-bundle-deps: OK');
}

main();
