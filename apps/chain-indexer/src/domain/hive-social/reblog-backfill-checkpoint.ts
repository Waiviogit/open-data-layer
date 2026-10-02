/** Completed-set checkpoint for `scripts/backfill-reblog-timestamps.ts`. */

export type ReblogBackfillCheckpoint = {
  completed: string[];
  updatedAt: string;
};

export function parseReblogBackfillCheckpoint(raw: unknown): ReblogBackfillCheckpoint {
  if (raw == null || typeof raw !== 'object') {
    return { completed: [], updatedAt: '' };
  }
  const rec = raw as Record<string, unknown>;
  const completed = new Set<string>();
  if (Array.isArray(rec['completed'])) {
    for (const name of rec['completed']) {
      if (typeof name === 'string' && name.trim() !== '') {
        completed.add(name.trim().toLowerCase());
      }
    }
  }
  const lastAccount = rec['lastAccount'];
  if (typeof lastAccount === 'string' && lastAccount.trim() !== '') {
    completed.add(lastAccount.trim().toLowerCase());
  }
  return {
    completed: [...completed],
    updatedAt: typeof rec['updatedAt'] === 'string' ? rec['updatedAt'] : '',
  };
}

export function markReblogBackfillCompleted(
  completed: readonly string[],
  account: string,
): string[] {
  const name = account.trim().toLowerCase();
  if (name === '' || completed.includes(name)) {
    return [...completed];
  }
  return [...completed, name];
}

export function accountsPendingReblogBackfill<T extends { account: string }>(
  accounts: readonly T[],
  completed: readonly string[],
): T[] {
  const done = new Set(completed);
  return accounts.filter((row) => !done.has(row.account));
}
