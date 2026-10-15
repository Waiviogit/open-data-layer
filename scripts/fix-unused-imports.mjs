/**
 * Removes unused imports via eslint-plugin-unused-imports.
 * Does not load eslint.config.mjs, so it never applies or fixes other rules.
 *
 * Usage:
 *   node scripts/fix-unused-imports.mjs
 *   node scripts/fix-unused-imports.mjs apps/query-api/src/mcp/mcp.module.ts
 *   node scripts/fix-unused-imports.mjs --check
 *   node scripts/fix-unused-imports.mjs --check apps/query-api
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_GLOBS = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
const DEFAULT_PATTERNS = SOURCE_GLOBS;

function parseArgs(argv) {
  const check = argv.includes('--check');
  const patterns = argv.filter((arg) => arg !== '--check');
  return {
    check,
    explicit: patterns.length > 0,
    patterns: patterns.length > 0 ? patterns : DEFAULT_PATTERNS,
  };
}

const { check, explicit, patterns } = parseArgs(process.argv.slice(2));

const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  allowInlineConfig: false,
  fix: !check,
  errorOnUnmatchedPattern: explicit,
  overrideConfig: [
    {
      ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/out-tsc/**',
        '**/.next/**',
        '**/coverage/**',
        '**/generated/**',
        '**/*.d.ts',
      ],
    },
    {
      files: SOURCE_GLOBS,
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
      linterOptions: {
        reportUnusedDisableDirectives: 'off',
      },
      plugins: {
        'unused-imports': unusedImports,
      },
      rules: {
        'unused-imports/no-unused-imports': 'error',
      },
    },
  ],
});

const results = await eslint.lintFiles(patterns);

if (!check) {
  for (const result of results) {
    if (typeof result.output === 'string') {
      result.output = result.output.replace(/\n{3,}/g, '\n\n');
    }
  }
  await ESLint.outputFixes(results);
}

const formatter = await eslint.loadFormatter('stylish');
const text = formatter.format(results);
if (text) {
  process.stdout.write(text);
}

const changed = results.filter((result) => typeof result.output === 'string');
const remaining = results.reduce(
  (count, result) => count + result.errorCount + result.warningCount,
  0,
);

if (check) {
  if (remaining === 0) {
    console.log('No unused imports.');
  }
  process.exit(remaining > 0 ? 1 : 0);
}

console.log(
  changed.length === 0
    ? 'No unused imports.'
    : `Removed unused imports in ${changed.length} file(s).`,
);

process.exit(remaining > 0 ? 1 : 0);
