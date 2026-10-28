import { inferMetadataFromPath, slugFromPath } from './infer-metadata-from-path';

describe('inferMetadataFromPath', () => {
  it('maps lessons and agents paths', () => {
    expect(inferMetadataFromPath('tasks/lessons.md')).toMatchObject({
      type: 'lesson',
      scope: 'platform',
    });
    expect(inferMetadataFromPath('apps/web/AGENTS.md')).toMatchObject({
      type: 'agents',
      scope: 'web',
    });
  });

  it('maps skills paths', () => {
    expect(inferMetadataFromPath('odl/hive-account-signup/SKILL.md')).toMatchObject({
      type: 'skill',
      scope: 'platform',
      title: 'hive account signup',
    });
  });

  it('maps object-create playbook paths', () => {
    expect(inferMetadataFromPath('odl/object-create/references/recipe.md')).toMatchObject({
      type: 'playbook',
      scope: 'platform',
      tags: expect.arrayContaining(['object-create-playbook', 'recipe']),
    });
  });

  it('maps kebab playbooks and extra references', () => {
    expect(
      inferMetadataFromPath('odl/object-create/references/service-offer.md'),
    ).toMatchObject({
      type: 'playbook',
      tags: expect.arrayContaining(['service_offer']),
    });
    expect(
      inferMetadataFromPath('odl/object-create/references/book-catalog.md'),
    ).toMatchObject({
      type: 'reference',
    });
  });

  it('normalizes Windows separators for object-create playbooks', () => {
    expect(
      inferMetadataFromPath('odl\\object-create\\references\\dish.md'),
    ).toMatchObject({
      type: 'playbook',
      tags: expect.arrayContaining(['dish']),
    });
  });

  it('maps registry virtual paths', () => {
    expect(inferMetadataFromPath('registry/object-type/product.md')).toMatchObject({
      type: 'registry',
      scope: 'core',
      tags: ['object-type', 'product'],
    });
  });

  it('maps platform entry and ops paths', () => {
    expect(inferMetadataFromPath('docs/README.md')).toMatchObject({
      type: 'overview',
      scope: 'platform',
      title: 'Documentation',
    });
    expect(inferMetadataFromPath('docs/getting-started.md')).toMatchObject({
      type: 'overview',
      scope: 'platform',
    });
    expect(inferMetadataFromPath('docs/operations/migrations.md')).toMatchObject({
      type: 'spec',
      scope: 'platform',
      title: 'migrations',
    });
    expect(inferMetadataFromPath('docs/deployment/portainer.md')).toMatchObject({
      type: 'spec',
      scope: 'platform',
    });
  });

  it('maps app developer guides and overviews outside spec/', () => {
    expect(inferMetadataFromPath('docs/apps/chain-indexer/developer-guide.md')).toMatchObject({
      type: 'spec',
      scope: 'chain-indexer',
      title: 'chain-indexer developer guide',
    });
    expect(inferMetadataFromPath('docs/apps/auth-api/overview.md')).toMatchObject({
      type: 'overview',
      scope: 'auth-api',
    });
    expect(inferMetadataFromPath('docs/apps/query-api/README.md')).toMatchObject({
      type: 'overview',
      scope: 'query-api',
    });
  });
});

describe('slugFromPath', () => {
  it('normalizes path to slug', () => {
    expect(slugFromPath('docs/apps/web/spec/i18n.md')).toBe(
      'docs-apps-web-spec-i18n',
    );
  });
});
