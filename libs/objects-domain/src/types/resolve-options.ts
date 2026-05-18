import type { GovernanceSnapshot } from './governance-snapshot';

/**
 * Optional debug hook for tracing why a given field (e.g. `image`) resolved to a
 * particular update. Wire to `Logger.debug` (or similar) from the caller; keep
 * off in production hot paths unless sampled.
 */
export type ResolveOptionsTraceFn = (
  event: string,
  payload: Record<string, unknown>,
) => void;

export interface ResolveOptionsTrace {
  /** Which `update_type` values emit trace events (e.g. `['image']`). */
  update_types: string[];
  log: ResolveOptionsTraceFn;
}

/**
 * Options controlling how ResolvedObjectView is assembled.
 */
export interface ResolveOptions {
  /** BCP-47 locale used for locale-sensitive update types. Default: 'en-US'. */
  locale: string;
  /** Restrict resolution to these update_types only. */
  update_types: string[];
  /** Governance snapshot to apply during resolution. */
  governance: GovernanceSnapshot;
  /** When true, REJECTED updates are included in ResolvedField.values. Default: false. */
  include_rejected: boolean;
  /**
   * When set, {@link ResolveOptionsTrace.update_types} controls which fields log
   * resolution steps (validity shortlist, locale filter, single-cardinality winner).
   */
  trace?: ResolveOptionsTrace;
}
