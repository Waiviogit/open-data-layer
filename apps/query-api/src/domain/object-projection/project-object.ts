import type { UpdateDefinition } from '@opden-data-layer/core';
import { UPDATE_REGISTRY } from '@opden-data-layer/core';
import type { ResolvedField, ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { GOVERNANCE_UPDATE_TYPES } from '../governance/governance.constants';
import { projectFieldValue } from './project-field';
import type { ProjectObjectInput, ProjectedObject, RefSummary } from './projected-object.types';

export type ProjectedObjectCore = Omit<ProjectedObject, 'hasAdministrativeAuthority' | 'hasOwnershipAuthority'>;
import { SEMANTIC_TYPE_BY_OBJECT_TYPE } from './semantic-types';

const GOVERNANCE_SKIP = new Set(GOVERNANCE_UPDATE_TYPES);

export function collectObjectRefIdsFromView(view: ResolvedObjectView): string[] {
  const ids = new Set<string>();
  for (const [updateType, field] of Object.entries(view.fields)) {
    if (GOVERNANCE_SKIP.has(updateType)) {
      continue;
    }
    const def = UPDATE_REGISTRY[updateType];
    if (!def || def.value_kind !== 'object_ref') {
      continue;
    }
    for (const u of field.values) {
      if (u.validity_status !== 'VALID') {
        continue;
      }
      const t = u.value_text?.trim();
      if (t) {
        ids.add(t);
      }
    }
  }
  return [...ids];
}

function projectObjectRefField(
  field: ResolvedField,
  def: UpdateDefinition,
  refSummariesById: Map<string, RefSummary>,
): RefSummary | RefSummary[] | null {
  const valid = field.values.filter((u) => u.validity_status === 'VALID');
  if (def.cardinality === 'single') {
    const id = valid[0]?.value_text?.trim();
    if (!id) {
      return null;
    }
    return refSummariesById.get(id) ?? null;
  }
  const summaries: RefSummary[] = [];
  for (const u of valid) {
    const id = u.value_text?.trim();
    if (!id) {
      continue;
    }
    const s = refSummariesById.get(id);
    if (s) {
      summaries.push(s);
    }
  }
  return summaries;
}

/**
 * Builds the core projection (fields, ids, semantic type). Authority flags are added in {@link ObjectProjectionService}.
 */
export function projectObjectCore(input: ProjectObjectInput): ProjectedObjectCore {
  const { view, ipfsGatewayBaseUrl, refSummariesById, viewerAccount } = input;
  const fields: Record<string, unknown> = {};

  for (const [updateType, field] of Object.entries(view.fields)) {
    if (GOVERNANCE_SKIP.has(updateType)) {
      continue;
    }
    const def = UPDATE_REGISTRY[updateType];
    if (!def) {
      continue;
    }
    const key = def.semantic_key ?? updateType;
    if (def.value_kind === 'object_ref') {
      fields[key] = projectObjectRefField(field, def, refSummariesById);
    } else {
      fields[key] = projectFieldValue(field, updateType, ipfsGatewayBaseUrl, viewerAccount);
    }
  }

  return {
    object_id: view.object_id,
    object_type: view.object_type,
    semantic_type: SEMANTIC_TYPE_BY_OBJECT_TYPE[view.object_type] ?? null,
    fields,
  };
}
