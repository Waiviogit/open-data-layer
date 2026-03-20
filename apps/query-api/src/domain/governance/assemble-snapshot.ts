import type { GovernanceSnapshot } from '@opden-data-layer/objects-domain';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import {
  collectValueTextsFromUpdates,
  parseInheritsFromJson,
  parseObjectControl,
  parseValidityCutoffJson,
} from './governance-field-extractors';

function fieldValues(view: ResolvedObjectView, updateType: string) {
  return view.fields[updateType]?.values ?? [];
}

/**
 * Extracts a governance snapshot from a resolved object view (governance update_types only).
 * `muted` is left empty; the resolver applies moderator mute aggregation and whitelist.
 */
export function assembleSnapshot(view: ResolvedObjectView): GovernanceSnapshot {
  const admins = collectValueTextsFromUpdates(fieldValues(view, 'admins'));
  const trusted = collectValueTextsFromUpdates(fieldValues(view, 'trusted'));
  const moderators = collectValueTextsFromUpdates(fieldValues(view, 'moderators'));
  const authorities = collectValueTextsFromUpdates(fieldValues(view, 'authorities'));
  const restricted = collectValueTextsFromUpdates(fieldValues(view, 'restricted'));
  const banned = collectValueTextsFromUpdates(fieldValues(view, 'banned'));
  const whitelist = collectValueTextsFromUpdates(fieldValues(view, 'whitelist'));

  const ocUpdates = fieldValues(view, 'object_control');
  const object_control =
    ocUpdates.length > 0 ? parseObjectControl(ocUpdates[0]?.value_text ?? null) : null;

  const inherits_from: GovernanceSnapshot['inherits_from'] = [];
  for (const u of fieldValues(view, 'inherits_from')) {
    const entry = parseInheritsFromJson(u.value_json);
    if (entry) {
      inherits_from.push(entry);
    }
  }

  const validity_cutoff: GovernanceSnapshot['validity_cutoff'] = [];
  for (const u of fieldValues(view, 'validity_cutoff')) {
    const row = parseValidityCutoffJson(u.value_json);
    if (row) {
      validity_cutoff.push(row);
    }
  }

  return {
    admins,
    trusted,
    moderators,
    validity_cutoff,
    restricted,
    whitelist,
    authorities,
    banned,
    object_control,
    muted: [],
    inherits_from,
  };
}
