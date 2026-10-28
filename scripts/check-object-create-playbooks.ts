import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { OBJECT_TYPE_REGISTRY } from '../libs/core/src/object-type-registry/object-type-registry';
import { playbookFileToObjectType } from '../libs/knowledge/src/routing/legacy-skill-path';

const ROOT = path.resolve(process.cwd());
const PLAYBOOK_DIR = path.join(
  ROOT,
  'vendor',
  'skills',
  'odl',
  'object-create',
  'references',
);

function fail(message: string): never {
  console.error(`check:object-create-playbooks: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const registryKeys = Object.keys(OBJECT_TYPE_REGISTRY).sort();
  let entries: string[];
  try {
    entries = (await readdir(PLAYBOOK_DIR)).filter((f) => f.endsWith('.md')).sort();
  } catch {
    fail(
      'vendor/skills/odl/object-create/references missing — run pnpm sync:odl-skills',
    );
  }

  const playbookKeys = new Set(
    entries.map((file) => playbookFileToObjectType(file)),
  );

  for (const key of registryKeys) {
    if (!playbookKeys.has(key)) {
      fail(
        `missing playbook for registry key: ${key} (expected ${key.replaceAll('_', '-')}.md)`,
      );
    }
  }

  console.log(
    `check:object-create-playbooks: OK (${registryKeys.length} registry keys)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
