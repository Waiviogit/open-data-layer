/** Max wait for chain-indexer to process a broadcast trx before refreshing anyway. */
export const TRX_CONFIRMATION_TIMEOUT_MS = 10_000;

/** Max wait for get_notifications WebSocket response. */
export const GET_NOTIFICATIONS_TIMEOUT_MS = 10_000;

/** localStorage key prefix for last-seen notification timestamp per user. */
export const NOTIFICATIONS_LAST_SEEN_KEY_PREFIX = 'odl_notifications_last_seen_';
