import type { JsonValue } from '@opden-data-layer/core';

export type ParsedSchedulerArgv = {
  runJob: string | null;
  payload: JsonValue | null;
};

/**
 * Parses `--run-job=name` and optional `--payload=<json>`.
 */
export function parseSchedulerArgv(
  argv: string[] = process.argv.slice(2),
): ParsedSchedulerArgv {
  let runJob: string | null = null;
  let payload: JsonValue | null = null;
  for (const a of argv) {
    if (a.startsWith('--run-job=')) {
      runJob = a.slice('--run-job='.length).trim();
    } else if (a.startsWith('--payload=')) {
      const raw = a.slice('--payload='.length);
      try {
        payload = JSON.parse(raw) as JsonValue;
      } catch {
        throw new Error(`Invalid JSON for --payload: ${raw}`);
      }
    }
  }
  return { runJob, payload };
}

export function isManualRunMode(argv: string[] = process.argv): boolean {
  return argv.some((a) => a.startsWith('--run-job='));
}
