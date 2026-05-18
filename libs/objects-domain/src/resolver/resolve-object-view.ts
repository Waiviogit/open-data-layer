import { UPDATE_REGISTRY, UPDATE_TYPES } from '@opden-data-layer/core';
import type { AggregatedObject, VoterWaivPowerMap } from '../types/aggregated-object';
import type { ResolveOptions } from '../types/resolve-options';
import type { ResolvedField, ResolvedObjectView, ResolvedUpdate } from '../types/resolved-view';
import { computeCuratorSet, resolveUpdateValidity } from './resolve-validity';
import { resolveSingleCardinality, resolveMultiCardinality } from './resolve-cardinality';
import { compareResolvedUpdatesByRanking } from './resolve-ranking';

function shouldTraceField(
  trace: ResolveOptions['trace'],
  updateType: string,
): trace is NonNullable<ResolveOptions['trace']> {
  return trace !== undefined && trace.update_types.includes(updateType);
}

/** Bigints and fields useful when comparing two competing image (etc.) updates. */
function traceResolvedUpdateRow(u: ResolvedUpdate): Record<string, unknown> {
  return {
    update_id: u.update_id,
    creator: u.creator,
    locale: u.locale,
    validity_status: u.validity_status,
    validity_tier: u.validity_tier,
    decisive_vote_event_seq:
      u.decisive_vote_event_seq === null ? null : u.decisive_vote_event_seq.toString(),
    event_seq: u.event_seq.toString(),
    created_at_unix: u.created_at_unix,
    approve_percent: u.approve_percent,
    field_weight: u.field_weight,
  };
}

/**
 * Prefer VALID updates in the requested locale. For multi-cardinality, locale-neutral
 * (null locale) updates are included in the preferred set with matched locales.
 * If the preferred set is empty, returns all VALID updates (legacy behavior).
 */
export function filterByLocalePreference(
  validUpdates: ResolvedUpdate[],
  locale: string,
  cardinality: 'single' | 'multi',
): ResolvedUpdate[] {
  const matched = validUpdates.filter((u) => u.locale === locale);
  if (cardinality === 'multi') {
    const neutral = validUpdates.filter((u) => u.locale === null);
    const preferred = [...matched, ...neutral];
    if (preferred.length > 0) {
      return preferred;
    }
  } else if (matched.length > 0) {
    return matched;
  }
  return validUpdates;
}

/**
 * Assemble ResolvedObjectView[] from raw aggregated DB data.
 *
 * Flow per object:
 *   1. Skip objects whose creator is banned
 *   2. Filter updates by banned creators and requested update_types
 *   3. Compute curator set C
 *   4. Group updates by update_type
 *   5. Per group: resolve validity for each update, apply locale preference on VALID rows, then cardinality
 *   6. Optionally include REJECTED updates when include_rejected = true
 *   7. Assemble ResolvedObjectView
 *
 * @see docs/spec/data-model/flow.md §Step 4
 */
export function resolveObjectViews(
  objects: AggregatedObject[],
  voterWaivPowers: VoterWaivPowerMap,
  options: ResolveOptions,
): ResolvedObjectView[] {
  const bannedSet = new Set(options.governance.banned);
  const requestedTypes = new Set(options.update_types);

  return objects
    .filter((obj) => !bannedSet.has(obj.core.creator))
    .map((obj) => resolveObject(obj, voterWaivPowers, options, bannedSet, requestedTypes));
}

function resolveObject(
  obj: AggregatedObject,
  voterWaivPowers: VoterWaivPowerMap,
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

      const { status, field_weight, approve_percent, validity_tier, decisive_vote_event_seq } =
        resolveUpdateValidity(
          update,
          updateVotes,
          curatorSet,
          options.governance,
          voterWaivPowers,
          obj.authorities,
        );

      return {
        update_id: update.update_id,
        update_type: update.update_type,
        creator: update.creator,
        locale: update.locale ?? null,
        created_at_unix: update.created_at_unix,
        event_seq: update.event_seq,
        value_text: update.value_text,
        value_geo: update.value_geo ?? null,
        value_json: update.value_json ?? null,
        validity_status: status,
        validity_tier,
        decisive_vote_event_seq,
        approve_percent,
        field_weight,
        rank_score: update.rank_score ?? null,
        rank_context: update.rank_context ?? null,
        rank_decisive_event_seq: update.rank_decisive_event_seq ?? null,
      };
    });

    const validResolved = resolvedUpdates.filter((u) => u.validity_status === 'VALID');

    if (shouldTraceField(options.trace, updateType)) {
      options.trace.log('objects-domain.resolve.field.validity_resolution', {
        object_id: obj.core.object_id,
        update_type: updateType,
        cardinality,
        localizable: definition?.localizable === true,
        rows: resolvedUpdates.map(traceResolvedUpdateRow),
      });
    }

    if (shouldTraceField(options.trace, updateType)) {
      options.trace.log('objects-domain.resolve.field.valid_only', {
        object_id: obj.core.object_id,
        update_type: updateType,
        rows: validResolved.map(traceResolvedUpdateRow),
      });
    }

    const localeScoped =
      definition?.localizable === true
        ? filterByLocalePreference(validResolved, options.locale, cardinality)
        : validResolved;

    if (shouldTraceField(options.trace, updateType) && definition?.localizable === true) {
      const matchedLocale = validResolved.filter((u) => u.locale === options.locale);
      const neutralLocale =
        cardinality === 'multi' ? validResolved.filter((u) => u.locale === null) : [];
      options.trace.log('objects-domain.resolve.field.locale_filter', {
        object_id: obj.core.object_id,
        update_type: updateType,
        requested_locale: options.locale,
        cardinality,
        single_matched_locale_count: matchedLocale.length,
        multi_neutral_locale_count: neutralLocale.length,
        used_fallback_all_valid_locale_rows:
          cardinality === 'single'
            ? matchedLocale.length === 0
            : matchedLocale.length === 0 && neutralLocale.length === 0,
        rows_after_locale: localeScoped.map(traceResolvedUpdateRow),
      });
    }

    let resolved: ResolvedUpdate[];
    if (cardinality === 'single') {
      const fieldTrace = options.trace;
      if (shouldTraceField(fieldTrace, updateType)) {
        resolved = resolveSingleCardinality(localeScoped, (singleTrace) => {
          fieldTrace.log('objects-domain.resolve.field.single_cardinality', {
            object_id: obj.core.object_id,
            update_type: updateType,
            requested_locale: options.locale,
            rule:
              'tier: admin > trusted > community > baseline | curator=null; LWAW/LWTW by decisive_vote_event_seq; community by field_weight, approve_percent; then update event_seq, created_at_unix, update_id',
            ...singleTrace,
          });
        });
      } else {
        resolved = resolveSingleCardinality(localeScoped);
      }
    } else {
      resolved = resolveMultiCardinality(localeScoped);
    }

    /**
     * Curator filter can mark community-submitted `aggregateRating` rows REJECTED even though
     * `rank_score` was persisted (indexer/migration). Those rows must still appear for read APIs.
     */
    if (
      updateType === UPDATE_TYPES.AGGREGATE_RATING &&
      cardinality === 'multi' &&
      options.include_rejected !== true
    ) {
      const rejectedRated = resolvedUpdates.filter(
        (u) =>
          u.validity_status === 'REJECTED' &&
          u.rank_score !== null &&
          typeof u.rank_score === 'number' &&
          Number.isFinite(u.rank_score),
      );
      const rejectedLocale =
        definition?.localizable === true
          ? filterByLocalePreference(rejectedRated, options.locale, 'multi')
          : rejectedRated;
      const seen = new Set(resolved.map((r) => r.update_id));
      const extra = rejectedLocale.filter((u) => !seen.has(u.update_id));
      resolved = [...resolved, ...extra].sort(compareResolvedUpdatesByRanking);
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
    canonical: obj.core.canonical,
    fields,
  };
}
