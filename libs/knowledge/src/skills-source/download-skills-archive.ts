import { mkdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { extract } from 'tar';
import {
  COMMIT_SHA_RE,
  DEFAULT_SKILLS_REPO,
  githubArchiveUrl,
  SKILLS_ARCHIVE_MAX_BYTES,
  SKILLS_ARCHIVE_TIMEOUT_MS,
  SKILLS_SHA_FILENAME,
  SKILLS_USER_AGENT,
} from './constants';
import {
  SkillsSourceError,
  skillsSourceErrorFromHttpStatus,
} from './skills-source-error';

export interface DownloadSkillsArchiveOptions {
  repo?: string;
  sha: string;
  destDir: string;
  timeoutMs?: number;
  maxBytes?: number;
  token?: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function posixArchivePath(archivePath: string): string {
  return archivePath.replace(/\\/g, '/').replace(/^\.?\//, '');
}

/** Keep only markdown under the `odl/` prefix. Reject `..`. */
export function shouldExtractArchivePath(archivePath: string): boolean {
  const posix = posixArchivePath(archivePath);
  if (posix.includes('\0')) {
    return false;
  }
  const parts = posix.split('/').filter(Boolean);
  if (parts.some((part) => part === '..' || part === '.')) {
    return false;
  }
  const rest = parts.slice(1);
  if (rest[0] !== 'odl') {
    return false;
  }
  const last = rest[rest.length - 1];
  return Boolean(last?.toLowerCase().endsWith('.md'));
}

async function readCappedBody(
  response: Response,
  maxBytes: number,
  url: string,
): Promise<Buffer> {
  if (!response.body) {
    throw new SkillsSourceError('invalid_archive', `Empty archive body from ${url}`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SkillsSourceError(
          'archive_too_large',
          `Skills archive from ${url} exceeded ${maxBytes} bytes`,
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof SkillsSourceError) {
      throw error;
    }
    if (isAbortError(error)) {
      throw new SkillsSourceError('timeout', `Timed out downloading skills archive from ${url}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillsSourceError('network', `Network error downloading skills archive: ${message}`);
  }

  return Buffer.concat(chunks);
}

export async function downloadSkillsArchive(
  options: DownloadSkillsArchiveOptions,
): Promise<void> {
  const sha = options.sha.trim().toLowerCase();
  if (!COMMIT_SHA_RE.test(sha)) {
    throw new SkillsSourceError('invalid_sha', `Refusing to download archive for invalid sha`);
  }

  const repo = options.repo ?? DEFAULT_SKILLS_REPO;
  const url = githubArchiveUrl(repo, sha);
  const headers: Record<string, string> = {
    'User-Agent': SKILLS_USER_AGENT,
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(options.timeoutMs ?? SKILLS_ARCHIVE_TIMEOUT_MS),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new SkillsSourceError('timeout', `Timed out downloading skills archive from ${url}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillsSourceError('network', `Network error downloading skills archive: ${message}`);
  }

  if (!response.ok) {
    throw skillsSourceErrorFromHttpStatus(response.status, url);
  }

  const buffer = await readCappedBody(
    response,
    options.maxBytes ?? SKILLS_ARCHIVE_MAX_BYTES,
    url,
  );

  await mkdir(options.destDir, { recursive: true });
  const tarPath = path.join(options.destDir, '.archive.tar.gz');
  try {
    await writeFile(tarPath, buffer);
    const extractArchive = extract as (opts: {
      file: string;
      cwd: string;
      strip: number;
      gzip: boolean;
      filter: (archivePath: string) => boolean;
    }) => Promise<void>;
    await extractArchive({
      file: tarPath,
      cwd: options.destDir,
      strip: 1,
      gzip: true,
      filter: shouldExtractArchivePath,
    });
  } catch (error) {
    if (error instanceof SkillsSourceError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillsSourceError('invalid_archive', `Failed to extract skills archive: ${message}`);
  } finally {
    await rm(tarPath, { force: true });
  }

  await writeFile(path.join(options.destDir, SKILLS_SHA_FILENAME), `${sha}\n`, 'utf8');
}
