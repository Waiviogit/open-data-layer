/**
 * Extensible enum — only 'full' is defined in V2.
 * Unrecognised values must be treated as null (control off).
 * @see docs/spec/governance-resolution.md §8
 */
export type ObjectControlMode = 'full';

export type GovernanceScope =
  | 'admins'
  | 'trusted'
  | 'moderators'
  | 'validityCutoff'
  | 'restricted'
  | 'whitelist'
  | 'authorities'
  | 'banned'
  | 'muted';

export interface ValidityCutoffEntry {
  account: string;
  timestamp: number;
}

/** One inherits_from update value (parsed from value_json). */
export interface InheritsFromEntry {
  object_id: string;
  scope: GovernanceScope[];
}

/**
 * Resolved governance snapshot computed at request time.
 * @see docs/spec/governance-resolution.md §4
 */
export interface GovernanceSnapshot {
  admins: string[];
  trusted: string[];
  moderators: string[];
  validity_cutoff: ValidityCutoffEntry[];
  restricted: string[];
  whitelist: string[];
  authorities: string[];
  banned: string[];
  object_control: ObjectControlMode | null;
  muted: string[];
  /** Direct inherits_from configuration on this object (not merged from parents). */
  inherits_from: InheritsFromEntry[];
}

/**
 * Default stub with all-empty sets and control off.
 * Replace with a real resolved snapshot when governance resolution is implemented.
 */
export const DEFAULT_GOVERNANCE_SNAPSHOT: GovernanceSnapshot = {
  admins: [],
  trusted: [],
  moderators: [],
  validity_cutoff: [],
  restricted: [],
  whitelist: [],
  authorities: [],
  banned: [],
  object_control: null,
  muted: [],
  inherits_from: [],
};
