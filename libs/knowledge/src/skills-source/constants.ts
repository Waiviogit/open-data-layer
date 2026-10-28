export const DEFAULT_SKILLS_REPO = 'Waiviogit/skills';
export const DEFAULT_SKILLS_BRANCH = 'master';

export const SKILLS_SHA_FILENAME = 'SKILLS_SHA';

export const SKILLS_USER_AGENT = 'opden-data-layer-knowledge-api';

export const SKILLS_HEAD_SHA_TIMEOUT_MS = 10_000;
export const SKILLS_ARCHIVE_TIMEOUT_MS = 60_000;
export const SKILLS_ARCHIVE_MAX_BYTES = 20 * 1024 * 1024;

export const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;

export const REQUIRED_SKILL_FILES = [
  'odl/knowledge-api-routing/SKILL.md',
  'odl/object-create/SKILL.md',
] as const;

export function githubCommitsUrl(repo: string, branch: string): string {
  return `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`;
}

export function githubArchiveUrl(repo: string, sha: string): string {
  return `https://codeload.github.com/${repo}/tar.gz/${sha}`;
}
