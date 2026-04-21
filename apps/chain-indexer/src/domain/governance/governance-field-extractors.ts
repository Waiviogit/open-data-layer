import type { JsonValue } from '@opden-data-layer/core';
import type {
  GovernanceScope,
  ObjectControlMode,
  ValidityCutoffEntry,
  InheritsFromEntry,
} from '@opden-data-layer/objects-domain';
import type { ResolvedUpdate } from '@opden-data-layer/objects-domain';

const GOVERNANCE_SCOPES = new Set<GovernanceScope>([
  'admins',
  'trusted',
  'moderators',
  'validityCutoff',
  'restricted',
  'whitelist',
  'authorities',
  'banned',
  'muted',
]);

/** Legacy inherits_from scope token (pre–camelCase update_type). Normalized to `validityCutoff`. */
const LEGACY_SCOPE_ALIASES: Record<string, GovernanceScope> = {
  validity_cutoff: 'validityCutoff',
};

export function collectValueTextsFromUpdates(updates: ResolvedUpdate[]): string[] {
  const out: string[] = [];
  for (const u of updates) {
    if (u.value_text !== null && u.value_text !== '') {
      out.push(u.value_text);
    }
  }
  return out;
}

export function parseObjectControl(text: string | null | undefined): ObjectControlMode | null {
  if (text === null || text === undefined || text === '') {
    return null;
  }
  if (text === 'full') {
    return 'full';
  }
  return null;
}

export function parseInheritsFromJson(value: JsonValue | null | undefined): InheritsFromEntry | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const rec = value as Record<string, unknown>;
  const objectId = rec.object_id;
  if (typeof objectId !== 'string' || objectId === '') {
    return null;
  }
  const scopeRaw = rec.scope;
  if (!Array.isArray(scopeRaw)) {
    return null;
  }
  const scope: GovernanceScope[] = [];
  for (const s of scopeRaw) {
    if (typeof s !== 'string') {
      continue;
    }
    const normalized = LEGACY_SCOPE_ALIASES[s] ?? s;
    if (GOVERNANCE_SCOPES.has(normalized as GovernanceScope)) {
      scope.push(normalized as GovernanceScope);
    }
  }
  return { object_id: objectId, scope };
}

export function parseValidityCutoffJson(value: JsonValue | null | undefined): ValidityCutoffEntry | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const rec = value as Record<string, unknown>;
  const account = rec.account;
  const timestamp = rec.timestamp;
  if (typeof account !== 'string' || account === '') {
    return null;
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return null;
  }
  return { account, timestamp };
}
