import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { playbookFileToObjectType } from '../routing/legacy-skill-path';
import type { KnowledgeFrontmatter, KnowledgeType } from './knowledge-frontmatter.schema';

const POSIX = (p: string): string => p.replace(/\\/g, '/');

export function slugFromPath(relativePath: string): string {
  const base = POSIX(relativePath).replace(/\.md$/i, '');
  return base
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function inferMetadataFromPath(relativePath: string): Partial<KnowledgeFrontmatter> {
  const p = POSIX(relativePath);

  if (p === 'tasks/lessons.md') {
    return { type: 'lesson', scope: 'platform', title: 'Lessons learned' };
  }

  if (p.endsWith('/AGENTS.md') || p === 'AGENTS.md') {
    const scope = p.startsWith('apps/')
      ? p.split('/')[1]
      : p.includes('apps/web')
        ? 'web'
        : 'platform';
    return { type: 'agents', scope, title: `AGENTS — ${scope}` };
  }

  const skillMatch = /^odl\/([^/]+)\/SKILL\.md$/i.exec(p);
  if (skillMatch) {
    const name = skillMatch[1];
    return {
      type: 'skill',
      scope: 'platform',
      title: name.replace(/-/g, ' '),
    };
  }

  const playbookMatch = /^odl\/object-create\/references\/([^/]+)\.md$/i.exec(p);
  if (playbookMatch) {
    const fileName = playbookMatch[1];
    const objectType = playbookFileToObjectType(`${fileName}.md`);
    if (objectType in OBJECT_TYPE_REGISTRY) {
      return {
        type: 'playbook',
        scope: 'platform',
        title: `Create ${objectType} object`,
        tags: ['object-create', 'object-create-playbook', objectType],
      };
    }
    return {
      type: 'reference',
      scope: 'platform',
      title: fileName.replace(/-/g, ' '),
      tags: ['object-create'],
    };
  }

  const referenceMatch = /^odl\/[^/]+\/references\/([^/]+)\.md$/i.exec(p);
  if (referenceMatch) {
    const fileName = referenceMatch[1];
    return {
      type: 'reference',
      scope: 'platform',
      title: fileName.replace(/-/g, ' '),
    };
  }

  if (p.startsWith('docs/architecture/adr/')) {
    const name = p.slice('docs/architecture/adr/'.length).replace(/\.md$/i, '');
    return { type: 'adr', scope: 'platform', title: name.replace(/-/g, ' ') };
  }

  if (p === 'docs/architecture/overview.md') {
    return { type: 'overview', scope: 'platform', title: 'Architecture overview' };
  }

  if (p === 'docs/README.md') {
    return { type: 'overview', scope: 'platform', title: 'Documentation' };
  }

  if (p === 'docs/getting-started.md') {
    return { type: 'overview', scope: 'platform', title: 'Local development environment' };
  }

  if (p === 'docs/standards/docs-standards.md') {
    return { type: 'spec', scope: 'platform', title: 'Documentation standards' };
  }

  if (p.startsWith('docs/operations/')) {
    const name = p.slice('docs/operations/'.length).replace(/\.md$/i, '');
    return { type: 'spec', scope: 'platform', title: name.replace(/-/g, ' ') };
  }

  if (p.startsWith('docs/deployment/')) {
    const name = p.slice('docs/deployment/'.length).replace(/\.md$/i, '');
    return { type: 'spec', scope: 'platform', title: name.replace(/-/g, ' ') };
  }

  const appOverviewMatch = /^docs\/apps\/([^/]+)\/overview\.md$/i.exec(p);
  if (appOverviewMatch) {
    const [, app] = appOverviewMatch;
    return { type: 'overview', scope: app, title: `${app} overview` };
  }

  const appDevGuideMatch = /^docs\/apps\/([^/]+)\/developer-guide\.md$/i.exec(p);
  if (appDevGuideMatch) {
    const [, app] = appDevGuideMatch;
    return { type: 'spec', scope: app, title: `${app} developer guide` };
  }

  const appReadmeMatch = /^docs\/apps\/([^/]+)\/README\.md$/i.exec(p);
  if (appReadmeMatch) {
    const [, app] = appReadmeMatch;
    return { type: 'overview', scope: app, title: `${app}` };
  }

  const appSpecMatch = /^docs\/apps\/([^/]+)\/spec\/(.+)\.md$/i.exec(p);
  if (appSpecMatch) {
    const [, app, rest] = appSpecMatch;
    const isOverview = rest === 'overview';
    return {
      type: (isOverview ? 'overview' : 'spec') as KnowledgeType,
      scope: app,
      title: isOverview ? `${app} overview` : rest.replace(/-/g, ' '),
    };
  }

  if (p.startsWith('docs/spec/')) {
    const name = p.slice('docs/spec/'.length).replace(/\.md$/i, '');
    return { type: 'spec', scope: 'platform', title: name.replace(/-/g, ' ') };
  }

  if (p.startsWith('registry/object-type/')) {
    const objectType = p.slice('registry/object-type/'.length).replace(/\.md$/i, '');
    return {
      type: 'registry',
      scope: 'core',
      title: `Object type: ${objectType}`,
      tags: ['object-type', objectType],
    };
  }

  if (p.startsWith('registry/update-type/')) {
    const updateType = p.slice('registry/update-type/'.length).replace(/\.md$/i, '');
    return {
      type: 'registry',
      scope: 'core',
      title: `Update type: ${updateType}`,
      tags: ['update-type', updateType],
    };
  }

  return { type: 'spec', scope: 'platform' };
}
