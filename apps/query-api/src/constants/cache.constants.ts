/** In-memory TTL for merged governance snapshots (seconds). */
export const GOVERNANCE_SNAPSHOT_CACHE_TTL_SEC = 30;

/** Redis TTL for recursive list-item counts per parent/list pair (seconds). */
export const LIST_COUNT_CACHE_TTL_SEC = 600;

/** Max depth when walking listItem trees via recursive CTE (cycle safety). */
export const LIST_TREE_MAX_DEPTH = 15;

/** Redis TTL for expanded object ref summaries per parent object (seconds). */
export const OBJECT_REF_EXPANSION_CACHE_TTL_SEC = 30;
