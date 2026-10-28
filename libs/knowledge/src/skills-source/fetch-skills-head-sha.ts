import {
  COMMIT_SHA_RE,
  DEFAULT_SKILLS_BRANCH,
  DEFAULT_SKILLS_REPO,
  githubCommitsUrl,
  SKILLS_HEAD_SHA_TIMEOUT_MS,
  SKILLS_USER_AGENT,
} from './constants';
import {
  SkillsSourceError,
  skillsSourceErrorFromHttpStatus,
} from './skills-source-error';

export type FetchSkillsHeadShaResult =
  | { status: 'unchanged' }
  | { status: 'changed'; sha: string; etag: string | undefined };

export interface FetchSkillsHeadShaOptions {
  repo?: string;
  branch?: string;
  etag?: string;
  token?: string;
  timeoutMs?: number;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function fetchSkillsHeadSha(
  options: FetchSkillsHeadShaOptions = {},
): Promise<FetchSkillsHeadShaResult> {
  const repo = options.repo ?? DEFAULT_SKILLS_REPO;
  const branch = options.branch ?? DEFAULT_SKILLS_BRANCH;
  const url = githubCommitsUrl(repo, branch);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.sha',
    'User-Agent': SKILLS_USER_AGENT,
  };
  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(options.timeoutMs ?? SKILLS_HEAD_SHA_TIMEOUT_MS),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new SkillsSourceError('timeout', `Timed out fetching skills head sha from ${url}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillsSourceError('network', `Network error fetching skills head sha: ${message}`);
  }

  if (response.status === 304) {
    return { status: 'unchanged' };
  }

  if (!response.ok) {
    throw skillsSourceErrorFromHttpStatus(response.status, url);
  }

  const sha = (await response.text()).trim().toLowerCase();
  if (!COMMIT_SHA_RE.test(sha)) {
    throw new SkillsSourceError(
      'invalid_sha',
      `GitHub head sha response was not a 40-char hex digest: ${sha.slice(0, 64)}`,
    );
  }

  return {
    status: 'changed',
    sha,
    etag: response.headers.get('etag') ?? undefined,
  };
}
