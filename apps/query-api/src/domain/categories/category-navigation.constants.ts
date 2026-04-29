/** Max rows in top-level shop department list before folding into Other. */
export const ROOT_DEPARTMENTS_LIMIT = 20;

/** Min distinct product-group count for a leaf row to appear at level 2+. */
export const LEVEL2_MIN_SUB_OBJECTS = 10;

export const LEVEL2_MIN_PCT = 0.01;
export const LEVEL2_MAX_PCT = 0.3;

/** Two categories are suppressed as duplicates when group_key overlap differs less than this. */
export const GROUP_KEY_OVERLAP_TOLERANCE = 10;
