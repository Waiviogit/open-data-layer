import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseKnowledgeFile } from './parse-knowledge-file';

const fixturesRoot = join(__dirname, '../__fixtures__/skills');

function listMdFiles(dir: string, prefix: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => join(prefix, name).replace(/\\/g, '/'));
}

describe('skills taxonomy', () => {
  it('types SKILL.md as skill, registry playbooks as playbook, extras as reference', () => {
    const skills = [
      'odl/hive-account-signup/SKILL.md',
      'odl/knowledge-api-routing/SKILL.md',
      'odl/object-create/SKILL.md',
    ];
    for (const relPath of skills) {
      const raw = readFileSync(join(fixturesRoot, relPath), 'utf8');
      const parsed = parseKnowledgeFile(relPath, raw);
      expect(parsed.frontmatter.type).toBe('skill');
      expect(parsed.frontmatter.description?.trim().length).toBeGreaterThan(0);
    }

    const playbooks = listMdFiles(
      join(fixturesRoot, 'odl/object-create/references'),
      'odl/object-create/references',
    );
    const parsedPlaybooks = playbooks.map((relPath) => ({
      relPath,
      parsed: parseKnowledgeFile(
        relPath,
        readFileSync(join(fixturesRoot, relPath), 'utf8'),
      ),
    }));

    expect(
      parsedPlaybooks
        .filter((row) => row.parsed.frontmatter.type === 'playbook')
        .map((row) => row.relPath),
    ).toEqual(
      expect.arrayContaining([
        'odl/object-create/references/recipe.md',
        'odl/object-create/references/dish.md',
      ]),
    );

    const catalog = parsedPlaybooks.find((row) =>
      row.relPath.endsWith('book-catalog.md'),
    );
    expect(catalog?.parsed.frontmatter.type).toBe('reference');
  });
});
