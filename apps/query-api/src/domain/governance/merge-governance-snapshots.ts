import type { GovernanceSnapshot } from '@opden-data-layer/objects-domain';

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function mergeValidityCutoffPreferOverlay(
  base: GovernanceSnapshot['validity_cutoff'],
  overlay: GovernanceSnapshot['validity_cutoff'],
): GovernanceSnapshot['validity_cutoff'] {
  const byAccount = new Map<string, (typeof base)[0]>();
  for (const row of base) {
    byAccount.set(row.account, row);
  }
  for (const row of overlay) {
    byAccount.set(row.account, row);
  }
  return [...byAccount.values()];
}

function mergeInheritsFrom(
  base: GovernanceSnapshot['inherits_from'],
  overlay: GovernanceSnapshot['inherits_from'],
): GovernanceSnapshot['inherits_from'] {
  const byObjectId = new Map<string, (typeof base)[0]>();
  for (const entry of base) {
    byObjectId.set(entry.object_id, entry);
  }
  for (const entry of overlay) {
    byObjectId.set(entry.object_id, entry);
  }
  return [...byObjectId.values()];
}

/**
 * Merges header-resolved governance (overlay) with config-resolved governance (base).
 * String arrays are unioned (base order first). validity_cutoff: overlay wins per account.
 * object_control: overlay if non-null. inherits_from: duplicate object_id keeps overlay.
 */
export function mergeGovernanceSnapshots(
  overlay: GovernanceSnapshot,
  base: GovernanceSnapshot,
): GovernanceSnapshot {
  return {
    admins: dedupeStrings([...base.admins, ...overlay.admins]),
    trusted: dedupeStrings([...base.trusted, ...overlay.trusted]),
    moderators: dedupeStrings([...base.moderators, ...overlay.moderators]),
    restricted: dedupeStrings([...base.restricted, ...overlay.restricted]),
    whitelist: dedupeStrings([...base.whitelist, ...overlay.whitelist]),
    authorities: dedupeStrings([...base.authorities, ...overlay.authorities]),
    banned: dedupeStrings([...base.banned, ...overlay.banned]),
    muted: dedupeStrings([...base.muted, ...overlay.muted]),
    validity_cutoff: mergeValidityCutoffPreferOverlay(base.validity_cutoff, overlay.validity_cutoff),
    object_control: overlay.object_control ?? base.object_control,
    inherits_from: mergeInheritsFrom(base.inherits_from, overlay.inherits_from),
  };
}
