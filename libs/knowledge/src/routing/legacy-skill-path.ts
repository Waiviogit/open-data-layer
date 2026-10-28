const LEGACY_SKILL_PREFIX = 'docs/skills/';
const LEGACY_PLAYBOOK_PREFIX = 'docs/skills/object-create/';

export interface ResolvedSkillPath {
  path: string;
  movedFrom: string | null;
}

function posix(p: string): string {
  return p.replace(/\\/g, '/');
}

export function objectTypeToPlaybookPath(objectType: string): string {
  return `odl/object-create/references/${objectType.replace(/_/g, '-')}.md`;
}

export function playbookFileToObjectType(fileName: string): string {
  return fileName.replace(/\.md$/i, '').replace(/-/g, '_');
}

/** Map retired `docs/skills/...` paths to indexed `odl/...` paths. */
export function resolveLegacySkillPath(inputPath: string): ResolvedSkillPath {
  const p = posix(inputPath);

  if (p.startsWith(LEGACY_PLAYBOOK_PREFIX) && p.endsWith('.md')) {
    const objectType = p.slice(LEGACY_PLAYBOOK_PREFIX.length).replace(/\.md$/i, '');
    if (objectType && !objectType.includes('/')) {
      return {
        path: objectTypeToPlaybookPath(objectType),
        movedFrom: p,
      };
    }
  }

  if (p.startsWith(LEGACY_SKILL_PREFIX) && p.endsWith('.md')) {
    const name = p.slice(LEGACY_SKILL_PREFIX.length).replace(/\.md$/i, '');
    if (name && !name.includes('/')) {
      return {
        path: `odl/${name}/SKILL.md`,
        movedFrom: p,
      };
    }
  }

  return { path: p, movedFrom: null };
}
