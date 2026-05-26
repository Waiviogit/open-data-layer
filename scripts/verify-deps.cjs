'use strict';

/**
 * Post dependency-update verification: OSV scan, full workspace build,
 * Nest webpack bundle-deps check, unit tests.
 *
 * Usage (repo root):
 *   pnpm verify:deps
 *   node scripts/verify-deps.cjs
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEPLOY_SMOKE_DIR = path.join(os.tmpdir(), 'odl-deploy-smoke');

/** Avoid Nx TUI race when nx is spawned from this script (Windows / VS Code terminal). */
const SUBPROCESS_ENV = {
  ...process.env,
  NX_TUI: 'false',
};

const STEPS = [
  {
    label: 'OSV vulnerability scan',
    command: 'pnpm',
    args: ['scan:vulnerabilities'],
  },
  {
    label: 'Build all projects',
    command: 'pnpm',
    args: ['nx', 'run-many', '-t', 'build', '--skip-nx-cache', '--output-style=stream'],
  },
  {
    label: 'Nest webpack bundle deps (Docker prod)',
    command: 'node',
    args: ['scripts/check-bundle-deps.cjs'],
  },
  {
    label: 'pnpm deploy smoke (query-api)',
    command: 'pnpm',
    args: [
      '--filter',
      '@opden-data-layer/query-api',
      '--legacy',
      '--prod',
      'deploy',
      DEPLOY_SMOKE_DIR,
    ],
    cleanup: () => fs.rmSync(DEPLOY_SMOKE_DIR, { recursive: true, force: true }),
  },
  {
    label: 'Unit tests',
    command: 'pnpm',
    args: ['nx', 'run-many', '-t', 'test', '--skip-nx-cache', '--output-style=stream'],
  },
];

function runStep(step) {
  console.log(`\n=== ${step.label} ===\n`);
  const result = spawnSync(step.command, step.args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: SUBPROCESS_ENV,
  });
  if (result.status !== 0) {
    console.error(`\nverify:deps failed at step: ${step.label}`);
    process.exit(result.status ?? 1);
  }
  if (step.cleanup) {
    step.cleanup();
  }
}

for (const step of STEPS) {
  runStep(step);
}

console.log('\nverify:deps passed.\n');
