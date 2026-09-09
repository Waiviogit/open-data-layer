/** Max wait for chain-indexer to process a broadcast trx before refreshing anyway. */
export const TRX_CONFIRMATION_TIMEOUT_MS = 10_000;

/** Max wait for IPFS batch_import to finish (WS + query-api object poll). */
export const BATCH_IMPORT_COMPLETION_TIMEOUT_MS = 60_000;

/** Grace wait when notifications WS is unavailable during batch_import edit flows. */
export const BATCH_IMPORT_NO_WS_GRACE_MS = 8_000;

/** Max wait for get_notifications WebSocket response. */
export const GET_NOTIFICATIONS_TIMEOUT_MS = 10_000;

/** Initial delay before WebSocket reconnect after disconnect. */
export const WS_RECONNECT_INITIAL_MS = 1_000;

/** Maximum delay between WebSocket reconnect attempts. */
export const WS_RECONNECT_MAX_MS = 30_000;

/** localStorage key prefix for last-seen notification timestamp per user. */
export const NOTIFICATIONS_LAST_SEEN_KEY_PREFIX = 'odl_notifications_last_seen_';
