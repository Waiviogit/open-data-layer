/** Parent Hive accounts for thread-style posts (Leo / Ecency). */
export const THREADS_ACC = 'leothreads';
export const ECENCY_THREADS_ACC = 'ecency.waves';

export const THREAD_ACCOUNTS = [THREADS_ACC, ECENCY_THREADS_ACC] as const;

export const THREAD_TYPE_LEO = 'leothreads';
export const THREAD_TYPE_ECENCY = 'ecencythreads';

export const THREAD_TYPES = [THREAD_TYPE_LEO, THREAD_TYPE_ECENCY] as const;

export type ThreadType = (typeof THREAD_TYPES)[number];

/** Default percent_hbd when extensions omit it (Hive: 10000 = 100%). */
export const DEFAULT_PERCENT_HBD = 10000;

/** Days from block time for cashout_time on new posts / threads. */
export const CASHOUT_OFFSET_DAYS = 7;

/** Seed symbols for $TICKER extraction when Redis/token registry is not used. */
export const SEED_TICKERS = ['HIVE', 'HBD', 'BTC', 'ETH', 'LTC'] as const;

const THREAD_TYPE_BY_PARENT: Readonly<Record<string, ThreadType>> = {
  [ECENCY_THREADS_ACC]: THREAD_TYPE_ECENCY,
  [THREADS_ACC]: THREAD_TYPE_LEO,
};

/**
 * Maps parent_author (thread account) to stored thread type. Unknown → Leo (reference behavior).
 */
export function getThreadType(parentAuthor: string): ThreadType {
  return THREAD_TYPE_BY_PARENT[parentAuthor] ?? THREAD_TYPE_LEO;
}

export function isThreadParentAccount(parentAuthor: string): boolean {
  return (THREAD_ACCOUNTS as readonly string[]).includes(parentAuthor);
}
