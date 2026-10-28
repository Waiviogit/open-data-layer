export type SkillsSourceErrorCode =
  | 'rate_limit'
  | 'http_error'
  | 'network'
  | 'timeout'
  | 'invalid_sha'
  | 'archive_too_large'
  | 'invalid_archive';

export class SkillsSourceError extends Error {
  readonly code: SkillsSourceErrorCode;
  readonly status: number | undefined;

  constructor(code: SkillsSourceErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'SkillsSourceError';
    this.code = code;
    this.status = status;
  }
}

export function skillsSourceErrorFromHttpStatus(
  status: number,
  url: string,
): SkillsSourceError {
  if (status === 403 || status === 429) {
    return new SkillsSourceError(
      'rate_limit',
      `GitHub rate limited request to ${url} (${status})`,
      status,
    );
  }
  return new SkillsSourceError(
    'http_error',
    `GitHub request to ${url} failed (${status})`,
    status,
  );
}
