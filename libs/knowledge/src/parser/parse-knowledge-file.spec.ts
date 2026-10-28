import { parseKnowledgeFile } from './parse-knowledge-file';

describe('parseKnowledgeFile', () => {
  it('infers app spec metadata from path', () => {
    const raw = '# Sync\n\nBody.';
    const parsed = parseKnowledgeFile('docs/apps/chain-indexer/spec/sync.md', raw);
    expect(parsed.frontmatter.type).toBe('spec');
    expect(parsed.frontmatter.scope).toBe('chain-indexer');
    expect(parsed.frontmatter.id).toBe('docs-apps-chain-indexer-spec-sync');
    expect(parsed.contentHash).toHaveLength(64);
  });

  it('parses YAML frontmatter overrides', () => {
    const raw = `---
title: Custom title
type: skill
tags: [hive, tutorial]
---
# Ignored heading

Content.`;
    const parsed = parseKnowledgeFile('odl/hive-create-account/SKILL.md', raw);
    expect(parsed.frontmatter.title).toBe('Custom title');
    expect(parsed.frontmatter.type).toBe('skill');
    expect(parsed.frontmatter.tags).toEqual(['hive', 'tutorial']);
  });

  it('accepts playbook as a frontmatter type', () => {
    const raw = `---
type: playbook
description: Recipe playbook.
---
# Create recipe

Body.`;
    const parsed = parseKnowledgeFile('odl/object-create/references/recipe.md', raw);
    expect(parsed.frontmatter.type).toBe('playbook');
  });

  it('detects overview type', () => {
    const parsed = parseKnowledgeFile(
      'docs/apps/query-api/spec/overview.md',
      '# Query API\n',
    );
    expect(parsed.frontmatter.type).toBe('overview');
    expect(parsed.frontmatter.scope).toBe('query-api');
  });

  it('uses explicit description from frontmatter', () => {
    const raw = `---
description: Short agent summary.
---
# Title

Body line.`;
    const parsed = parseKnowledgeFile('odl/example/SKILL.md', raw);
    expect(parsed.frontmatter.description).toBe('Short agent summary.');
  });

  it('folds Agent Skills description: >- block scalars', () => {
    const raw = `---
name: example
description: >-
  Guide a user through creating a new Hive blockchain account via public signup
  providers. Use when the user needs a new Hive account.
---
# Hive account signup

Body.`;
    const parsed = parseKnowledgeFile('odl/example/SKILL.md', raw);
    expect(parsed.frontmatter.description).toBe(
      'Guide a user through creating a new Hive blockchain account via public signup providers. Use when the user needs a new Hive account.',
    );
  });

  it('rejects unknown frontmatter type', () => {
    const raw = `---
type: template
---
# Template

Body.`;
    expect(() =>
      parseKnowledgeFile('docs/standards/templates/object-create-playbook.md', raw),
    ).toThrow(/Invalid option/);
  });

  it('falls back to first body line after title for description', () => {
    const raw = `# My Skill

Guide the user through [signup](https://example.com).

## Steps`;
    const parsed = parseKnowledgeFile('odl/example/SKILL.md', raw);
    expect(parsed.frontmatter.description).toBe('Guide the user through signup.');
  });
});
