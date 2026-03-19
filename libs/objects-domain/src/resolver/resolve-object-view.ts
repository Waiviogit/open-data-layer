import { UPDATE_REGISTRY } from '@opden-data-layer/core';
import type { AggregatedObject, VoterReputationMap } from '../types/aggregated-object';
import type { ResolveOptions } from '../types/resolve-options';
import type { ResolvedField, ResolvedObjectView, ResolvedUpdate } from '../types/resolved-view';
import { computeCuratorSet, resolveUpdateValidity } from './resolve-validity';
import { resolveSingleCardinality, resolveMultiCardinality } from './resolve-cardinality';

/**
 * Assemble ResolvedObjectView[] from raw aggregated DB data.
 *
 * Flow per object:
 *   1. Skip objects whose creator is banned
 *   2. Filter updates by banned creators and requested update_types
 *   3. Compute curator set C
 *   4. Group updates by update_type
 *   5. Per group: resolve validity for each update, then resolve cardinality
 *   6. Optionally include REJECTED updates when include_rejected = true
 *   7. Assemble ResolvedObjectView
 *
 * @see spec/postgres-concept/flow.md §Step 4
 */
export function resolveObjectViews(
  objects: AggregatedObject[],
  voterReputations: VoterReputationMap,
  options: ResolveOptions,
): ResolvedObjectView[] {
  const bannedSet = new Set(options.governance.banned);
  const requestedTypes = new Set(options.update_types);

  return objects
    .filter((obj) => !bannedSet.has(obj.core.creator))
    .map((obj) => resolveObject(obj, voterReputations, options, bannedSet, requestedTypes));
}

function resolveObject(
  obj: AggregatedObject,
  voterReputations: VoterReputationMap,
  options: ResolveOptions,
  bannedSet: Set<string>,
  requestedTypes: Set<string>,
): ResolvedObjectView {
  const filteredUpdates = obj.updates.filter(
    (u) => !bannedSet.has(u.creator) && requestedTypes.has(u.update_type),
  );

  const curatorSet = computeCuratorSet(obj.authorities, options.governance);

  const updatesByType = new Map<string, string[]>();
  for (const update of filteredUpdates) {
    const existing = updatesByType.get(update.update_type);
    if (existing !== undefined) {
      existing.push(update.update_id);
    } else {
      updatesByType.set(update.update_type, [update.update_id]);
    }
  }

  const fields: Record<string, ResolvedField> = {};
  const updateMap = new Map(filteredUpdates.map((u) => [u.update_id, u]));

  for (const [updateType, updateIds] of updatesByType) {
    const definition = UPDATE_REGISTRY[updateType];
    const cardinality = definition?.cardinality ?? 'single';

    const resolvedUpdates: ResolvedUpdate[] = updateIds.flatMap((updateId) => {
      const update = updateMap.get(updateId);
      if (!update) return [];
      const updateVotes = obj.validity_votes;

      const { status, field_weight } = resolveUpdateValidity(
        update,
        updateVotes,
        curatorSet,
        options.governance,
        voterReputations,
        obj.authorities,
      );

      return {
        update_id: update.update_id,
        update_type: update.update_type,
        creator: update.creator,
        created_at_unix: update.created_at_unix,
        event_seq: update.event_seq,
        value_text: update.value_text,
        value_json: update.value_json ?? null,
        validity_status: status,
        field_weight,
        rank_score: null,
        rank_context: null,
      };
    });

    const rankVotesForType = obj.rank_votes.filter((v) =>
      updateIds.includes(v.update_id),
    );

    let resolved: ResolvedUpdate[];
    if (cardinality === 'single') {
      resolved = resolveSingleCardinality(resolvedUpdates);
    } else {
      resolved = resolveMultiCardinality(resolvedUpdates, rankVotesForType, options.governance);
    }

    if (options.include_rejected) {
      const rejected = resolvedUpdates.filter((u) => u.validity_status === 'REJECTED');
      resolved = [...resolved, ...rejected];
    }

    fields[updateType] = { update_type: updateType, cardinality, values: resolved };
  }

  return {
    object_id: obj.core.object_id,
    object_type: obj.core.object_type,
    creator: obj.core.creator,
    weight: obj.core.weight,
    meta_group_id: obj.core.meta_group_id,
    fields,
  };
}
