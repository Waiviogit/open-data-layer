import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import { projectFieldValue } from './project-field';
import type { RankVoteProjection, RefSummary } from './projected-object.types';
import { emptyRankVoteProjection } from './projected-object.types';
import type { ListItemsRecursiveCountService } from './list-items-recursive-count.service';

/**
 * Update types fetched when summarising an `object_ref` target.
 * Add or remove entries here to control what appears in `RefSummary.fields`.
 */
export const REF_SUMMARY_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.PARENT,
  UPDATE_TYPES.DESCRIPTION,
  UPDATE_TYPES.TAG_CATEGORY_ITEM,
  UPDATE_TYPES.AGGREGATE_RATING,
];

export async function expandObjectRefs(
  refIds: string[],
  deps: {
    aggregatedObjectRepo: AggregatedObjectRepository;
    objectViewService: ObjectViewService;
    listItemsRecursiveCountService: ListItemsRecursiveCountService;
    parentObjectId: string;
    governance: GovernanceSnapshot;
    locale: string;
    ipfsGatewayBaseUrl: string;
    viewerAccount?: string;
    viewerAdminIds?: Set<string>;
  },
): Promise<Map<string, RefSummary>> {
  const {
    aggregatedObjectRepo,
    objectViewService,
    listItemsRecursiveCountService,
    parentObjectId,
    governance,
    locale,
    ipfsGatewayBaseUrl,
    viewerAccount,
    viewerAdminIds,
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
    const fields: Record<string, unknown> = {};
    for (const [updateType, field] of Object.entries(view.fields)) {
      fields[updateType] = projectFieldValue(
        field,
        updateType,
        ipfsGatewayBaseUrl,
        viewerAccount,
        rankVoteProjection,
      );
    }
    const summary: RefSummary = {
      object_id: id,
      object_type: core.object_type,
      fields,
      weight: core.weight ?? null,
      hasAdministrativeAuthority: viewerAdminIds?.has(id) ?? false,
    };
    if (core.object_type === 'list') {
      summary.listItemsCount = listItemCountsById.get(id) ?? 0;
    }
    out.set(id, summary);
  }

  const toResolve: Array<{ refId: string; parentId: string }> = [];
  for (const [refId, summary] of out) {
    if (!summary.fields[UPDATE_TYPES.IMAGE]) {
      const view = byId.get(refId)?.view;
      const parentField = view?.fields[UPDATE_TYPES.PARENT];
      const parentId = parentField?.values
        .find((u) => u.validity_status === 'VALID')
        ?.value_text?.trim();
      if (parentId) {
        toResolve.push({ refId, parentId });
      }
    }
  }

  if (toResolve.length > 0) {
    const uniqueParentIds = [...new Set(toResolve.map((e) => e.parentId))];
    const { objects: parentObjs, voterWaivPowers: parentPowers } =
      await aggregatedObjectRepo.loadByObjectIds(uniqueParentIds, {
        viewerAccount,
        includeRankVoteProjection: false,
      });
    const parentViews = objectViewService.resolve(parentObjs, parentPowers, {
      update_types: [UPDATE_TYPES.IMAGE],
      locale,
      include_rejected: false,
      governance,
    });
    const parentImageById = new Map<string, string>();
    for (let i = 0; i < parentObjs.length; i++) {
      const pid = parentObjs[i]!.core.object_id;
      const imgField = parentViews[i]?.fields[UPDATE_TYPES.IMAGE];
      if (imgField) {
        const url = projectFieldValue(imgField, UPDATE_TYPES.IMAGE, ipfsGatewayBaseUrl) as
          | string
          | null;
        if (url) {
          parentImageById.set(pid, url);
        }
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
