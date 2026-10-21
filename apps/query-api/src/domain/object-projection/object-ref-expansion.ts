import type { UpdateDefinition } from '@opden-data-layer/core';
import { UPDATE_REGISTRY, UPDATE_TYPES } from '@opden-data-layer/core';
import type { GovernanceSnapshot, ResolvedField, ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import { projectFieldValue } from './project-field';
import type { RankVoteProjection, RefSummary } from './projected-object.types';
import type { ListItemsRecursiveCountService } from './list-items-recursive-count.service';

/**
 * Update types fetched when summarising an `object_ref` target.
 * Add or remove entries here to control what appears in `RefSummary.fields`.
 */
export const REF_SUMMARY_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.PARENT,
  UPDATE_TYPES.PRICE,
  UPDATE_TYPES.BRAND,
  UPDATE_TYPES.DESCRIPTION,
  UPDATE_TYPES.TAG_CATEGORY_ITEM,
  UPDATE_TYPES.AGGREGATE_RATING,
  UPDATE_TYPES.TITLE,
  UPDATE_TYPES.ADDRESS,
  UPDATE_TYPES.GEO,
  UPDATE_TYPES.IDENTIFIER,
];

const NESTED_REF_SUMMARY_UPDATE_TYPES = [UPDATE_TYPES.NAME, UPDATE_TYPES.IMAGE] as const;

const REF_SUMMARY_OBJECT_REF_TYPES = REF_SUMMARY_UPDATE_TYPES.filter(
  (updateType) => UPDATE_REGISTRY[updateType]?.value_kind === 'object_ref',
);

function compactRefSummary(summary: RefSummary): RefSummary {
  const fields: Record<string, unknown> = {};
  const name = summary.fields[UPDATE_TYPES.NAME];
  const image = summary.fields[UPDATE_TYPES.IMAGE];
  if (typeof name === 'string' && name.length > 0) {
    fields[UPDATE_TYPES.NAME] = name;
  }
  if (typeof image === 'string' && image.length > 0) {
    fields[UPDATE_TYPES.IMAGE] = image;
  }
  return {
    object_id: summary.object_id,
    object_type: summary.object_type,
    fields,
    weight: summary.weight,
  };
}

function collectNestedRefIdsFromView(view: ResolvedObjectView): string[] {
  const ids = new Set<string>();
  for (const updateType of REF_SUMMARY_OBJECT_REF_TYPES) {
    const field = view.fields[updateType];
    if (!field) {
      continue;
    }
    for (const u of field.values) {
      if (u.validity_status !== 'VALID') {
        continue;
      }
      const id = u.value_text?.trim();
      if (id) {
        ids.add(id);
      }
    }
  }
  return [...ids];
}

function projectRefFieldValue(
  field: ResolvedField,
  def: UpdateDefinition,
  nestedById: Map<string, RefSummary>,
): RefSummary | RefSummary[] | null {
  const valid = field.values.filter((u) => u.validity_status === 'VALID');
  if (def.cardinality === 'single') {
    const id = valid[0]?.value_text?.trim();
    if (!id) {
      return null;
    }
    const summary = nestedById.get(id);
    return summary ? compactRefSummary(summary) : null;
  }
  const summaries: RefSummary[] = [];
  const seenIds = new Set<string>();
  for (const u of valid) {
    const id = u.value_text?.trim();
    if (!id || seenIds.has(id)) {
      continue;
    }
    const summary = nestedById.get(id);
    if (summary) {
      seenIds.add(id);
      summaries.push(compactRefSummary(summary));
    }
  }
  return summaries.length > 0 ? summaries : null;
}

function buildScalarFields(
  view: ResolvedObjectView,
  contentBaseUrl: string | undefined,
  viewerAccount: string | undefined,
  rankVoteProjection: RankVoteProjection,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [updateType, field] of Object.entries(view.fields)) {
    const def = UPDATE_REGISTRY[updateType];
    if (!def || def.value_kind === 'object_ref') {
      continue;
    }
    fields[updateType] = projectFieldValue(
      field,
      updateType,
      contentBaseUrl,
      viewerAccount,
      rankVoteProjection,
    );
  }
  return fields;
}

function attachObjectRefFields(
  fields: Record<string, unknown>,
  view: ResolvedObjectView,
  nestedById: Map<string, RefSummary>,
): void {
  for (const updateType of REF_SUMMARY_OBJECT_REF_TYPES) {
    const field = view.fields[updateType];
    const def = UPDATE_REGISTRY[updateType];
    if (!field || !def) {
      continue;
    }
    const projected = projectRefFieldValue(field, def, nestedById);
    if (projected != null) {
      fields[updateType] = projected;
    }
  }
}

async function loadNestedRefSummaries(
  nestedRefIds: string[],
  alreadyLoadedIds: Set<string>,
  deps: {
    aggregatedObjectRepo: AggregatedObjectRepository;
    objectViewService: ObjectViewService;
    governance: GovernanceSnapshot;
    locale: string;
    contentBaseUrl: string | undefined;
    viewerAccount?: string;
  },
): Promise<Map<string, RefSummary>> {
  const nestedById = new Map<string, RefSummary>();
  const toLoad = nestedRefIds.filter((id) => !alreadyLoadedIds.has(id));
  if (toLoad.length === 0) {
    return nestedById;
  }

  const { aggregatedObjectRepo, objectViewService, governance, locale, contentBaseUrl, viewerAccount } =
    deps;
  const { objects, voterWaivPowers, rankVoteProjection } = await aggregatedObjectRepo.loadByObjectIds(
    toLoad,
    {
      viewerAccount,
      includeRankVoteProjection: false,
    },
  );
  const views = objectViewService.resolve(objects, voterWaivPowers, {
    update_types: [...NESTED_REF_SUMMARY_UPDATE_TYPES],
    locale,
    include_rejected: false,
    governance,
  });

  for (let i = 0; i < objects.length; i++) {
    const core = objects[i]!.core;
    const view = views[i];
    if (!view) {
      continue;
    }
    const fields = buildScalarFields(view, contentBaseUrl, viewerAccount, rankVoteProjection);
    nestedById.set(core.object_id, {
      object_id: core.object_id,
      object_type: core.object_type,
      fields,
      weight: core.weight ?? null,
    });
  }

  return nestedById;
}

export async function expandObjectRefs(
  refIds: string[],
  deps: {
    aggregatedObjectRepo: AggregatedObjectRepository;
    objectViewService: ObjectViewService;
    listItemsRecursiveCountService: ListItemsRecursiveCountService;
    parentObjectId: string;
    governance: GovernanceSnapshot;
    locale: string;
    contentBaseUrl: string | undefined;
    viewerAccount?: string;
    viewerFavoriteIds?: Set<string>;
  },
): Promise<Map<string, RefSummary>> {
  const {
    aggregatedObjectRepo,
    objectViewService,
    listItemsRecursiveCountService,
    parentObjectId,
    governance,
    locale,
    contentBaseUrl,
    viewerAccount,
    viewerFavoriteIds,
  } = deps;
  const out = new Map<string, RefSummary>();
  if (refIds.length === 0) {
    return out;
  }

  const { objects, voterWaivPowers, rankVoteProjection } = await aggregatedObjectRepo.loadByObjectIds(
    refIds,
    {
      viewerAccount,
      includeRankVoteProjection: true,
    },
  );
  const views = objectViewService.resolve(objects, voterWaivPowers, {
    update_types: [...REF_SUMMARY_UPDATE_TYPES],
    locale,
    include_rejected: false,
    governance,
  });

  const byId = new Map(objects.map((o, i) => [o.core.object_id, { view: views[i]!, core: o.core }]));
  const alreadyLoadedIds = new Set(byId.keys());

  const nestedRefIds = new Set<string>();
  for (const { view } of byId.values()) {
    for (const id of collectNestedRefIdsFromView(view)) {
      nestedRefIds.add(id);
    }
  }

  const nestedById = await loadNestedRefSummaries([...nestedRefIds], alreadyLoadedIds, {
    aggregatedObjectRepo,
    objectViewService,
    governance,
    locale,
    contentBaseUrl,
    viewerAccount,
  });

  for (const [id, summary] of nestedById) {
    alreadyLoadedIds.add(id);
  }

  const listRefIds = [...byId.values()]
    .filter((entry) => entry.core.object_type === 'list')
    .map((entry) => entry.core.object_id);
  const listItemCountsById = await listItemsRecursiveCountService.countForListRefIds(
    listRefIds,
    { parentObjectId, governance, locale, viewerAccount },
  );

  for (const id of refIds) {
    const entry = byId.get(id);
    if (!entry) {
      continue;
    }
    const { view, core } = entry;
    const fields = buildScalarFields(view, contentBaseUrl, viewerAccount, rankVoteProjection);
    attachObjectRefFields(fields, view, nestedById);
    const summary: RefSummary = {
      object_id: id,
      object_type: core.object_type,
      fields,
      weight: core.weight ?? null,
      isFavorited: viewerFavoriteIds?.has(id) ?? false,
    };
    if (core.object_type === 'list') {
      summary.listItemsCount = listItemCountsById.get(id) ?? 0;
    }
    out.set(id, summary);
  }

  const toResolve: Array<{ refId: string; parentId: string }> = [];
  for (const [refId, summary] of out) {
    if (!summary.fields[UPDATE_TYPES.IMAGE]) {
      const parentField = summary.fields[UPDATE_TYPES.PARENT];
      let parentId: string | undefined;
      if (parentField != null && typeof parentField === 'object' && !Array.isArray(parentField)) {
        const pid = (parentField as RefSummary).object_id;
        if (typeof pid === 'string' && pid.trim().length > 0) {
          parentId = pid.trim();
        }
      }
      if (!parentId) {
        const view = byId.get(refId)?.view;
        const parentUpdateField = view?.fields[UPDATE_TYPES.PARENT];
        parentId =
          parentUpdateField?.values
            .find((u) => u.validity_status === 'VALID')
            ?.value_text?.trim() ?? undefined;
      }
      if (parentId) {
        toResolve.push({ refId, parentId });
      }
    }
  }

  if (toResolve.length > 0) {
    const uniqueParentIds = [...new Set(toResolve.map((e) => e.parentId))];
    const missingParentIds = uniqueParentIds.filter((pid) => !nestedById.has(pid));
    if (missingParentIds.length > 0) {
      const extraNested = await loadNestedRefSummaries(missingParentIds, alreadyLoadedIds, {
        aggregatedObjectRepo,
        objectViewService,
        governance,
        locale,
        contentBaseUrl,
        viewerAccount,
      });
      for (const [pid, summary] of extraNested) {
        nestedById.set(pid, summary);
      }
    }

    const parentImageById = new Map<string, string>();
    for (const parentId of uniqueParentIds) {
      const nested = nestedById.get(parentId);
      const image = nested?.fields[UPDATE_TYPES.IMAGE];
      if (typeof image === 'string' && image.length > 0) {
        parentImageById.set(parentId, image);
      }
    }

    for (const { refId, parentId } of toResolve) {
      const url = parentImageById.get(parentId);
      if (url) {
        const summary = out.get(refId);
        if (summary) {
          summary.fields[UPDATE_TYPES.IMAGE] = url;
        }
      }
    }
  }

  return out;
}
