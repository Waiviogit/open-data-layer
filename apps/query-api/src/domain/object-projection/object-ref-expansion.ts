import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import { projectFieldValue } from './project-field';
import type { RefSummary } from './projected-object.types';

/**
 * Update types fetched when summarising an `object_ref` target.
 * Add or remove entries here to control what appears in `RefSummary.fields`.
 */
export const REF_SUMMARY_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.IMAGE,
];

export async function expandObjectRefs(
  refIds: string[],
  deps: {
    aggregatedObjectRepo: AggregatedObjectRepository;
    objectViewService: ObjectViewService;
    governance: GovernanceSnapshot;
    locale: string;
    ipfsGatewayBaseUrl: string;
    viewerAccount?: string;
  },
): Promise<Map<string, RefSummary>> {
  const { aggregatedObjectRepo, objectViewService, governance, locale, ipfsGatewayBaseUrl, viewerAccount } =
    deps;
  const out = new Map<string, RefSummary>();
  if (refIds.length === 0) {
    return out;
  }

  const { objects, voterReputations } = await aggregatedObjectRepo.loadByObjectIds(refIds);
  const views = objectViewService.resolve(objects, voterReputations, {
    update_types: [...REF_SUMMARY_UPDATE_TYPES],
    locale,
    include_rejected: false,
    governance,
  });

  const byId = new Map(objects.map((o, i) => [o.core.object_id, { view: views[i]!, core: o.core }]));

  for (const id of refIds) {
    const entry = byId.get(id);
    if (!entry) {
      continue;
    }
    const { view, core } = entry;
    const fields: Record<string, unknown> = {};
    for (const [updateType, field] of Object.entries(view.fields)) {
      fields[updateType] = projectFieldValue(field, updateType, ipfsGatewayBaseUrl, viewerAccount);
    }
    out.set(id, {
      object_id: id,
      object_type: core.object_type,
      fields,
    });
  }

  return out;
}
