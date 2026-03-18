/**
 * Generates object-types and object-updates spec docs from libs/core registries.
 * Run from repo root: pnpm docs  or  node scripts/gen-docs.js
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function run(script) {
  execSync(`node "${path.join(ROOT, script)}"`, {
    stdio: 'inherit',
    cwd: ROOT,
  });
}

console.log('Generating object-types spec...');
run('scripts/gen-object-types-spec.js');

console.log('Generating object-updates spec...');
run('scripts/gen-object-updates-spec.js');

console.log('Docs generated: spec/object-types/, spec/object-updates/');
