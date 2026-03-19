import type { GovernanceSnapshot } from './governance-snapshot';

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
}
