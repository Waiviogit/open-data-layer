/** Redis TTL for parsed affiliate configs (seconds). Legacy: 30 minutes. */
export const AFFILIATE_CODES_CACHE_TTL_SEC = 1800;

/** In-memory TTL for merged governance snapshots (seconds). */
export const GOVERNANCE_SNAPSHOT_CACHE_TTL_SEC = 30;

/** Redis TTL for recursive list-item counts per parent/list pair (seconds). */
export const LIST_COUNT_CACHE_TTL_SEC = 600;

/** Max depth when walking listItem trees via recursive CTE (cycle safety). */
export const LIST_TREE_MAX_DEPTH = 15;

/** Log a warning when BFS loads more than this many distinct nodes for one count pass. */
export const LIST_TREE_WARN_NODE_COUNT = 500;

/** Max object ids per `loadForListCount` batch during list-tree BFS. */
export const LIST_COUNT_BFS_BATCH_SIZE = 64;

/** Redis TTL for expanded object ref summaries per parent object (seconds). */
export const OBJECT_REF_EXPANSION_CACHE_TTL_SEC = 30;

/** Redis TTL for WAIV/Hive USD rate used in post reward enrichment (seconds). */
export const POST_REWARD_WAIV_HIVE_RATE_CACHE_TTL_SEC = 600;

/** Redis TTL for fiat crosses (USD base) in post reward enrichment (seconds). */
export const POST_REWARD_FIAT_RATES_CACHE_TTL_SEC = 21_600;

/** Redis TTL for Hive dynamic global properties (vesting fund/shares for activity HP). */
export const HIVE_GLOBAL_PROPERTIES_CACHE_TTL_SEC = 300;

/** Redis TTL for Hive reward fund used in account sidebar vote value (seconds). */
export const HIVE_REWARD_FUND_CACHE_TTL_SEC = 60;

/** Redis TTL for WAIV Engine reward pool rate (seconds). */
export const WAIV_REWARD_POOL_CACHE_TTL_SEC = 60;

/** Redis TTL for WAIV/HIVE diesel pool quote price used in account sidebar (seconds). */
export const WAIV_DIESEL_POOL_CACHE_TTL_SEC = 60;

/** Redis TTL for condenser `get_accounts` snapshot (profile + sidebar dedup). */
export const HIVE_ACCOUNTS_CACHE_TTL_SEC = 60;

/** Redis TTL for Instacart IDP recipe `products_link_url` (30 days). */
export const INSTACART_RECIPE_LINK_CACHE_TTL_SEC = 2_592_000;
