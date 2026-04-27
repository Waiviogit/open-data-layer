import type { PostObject } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';

import type {
  BatchProjectOptions,
  ObjectProjectionService,
} from '../object-projection/object-projection.service';
import type { ProjectedObject } from '../object-projection/projected-object.types';
import { LINKED_OBJECT_DESCRIPTION_MAX } from './feed.constants';
import { stripHtmlForExcerpt, truncateExcerpt } from './post-excerpt';

function placeholderProjectedObject(o: PostObject): ProjectedObject {
  return {
    object_id: o.object_id,
    object_type: o.object_type ?? '',
    semantic_type: null,
    fields: {},
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
  };
}

function hasDisplayImage(p: ProjectedObject): boolean {
  const img = p.fields['image'];
  return typeof img === 'string' && img.length > 0;
}

/**
 * Tagged / linked objects: prefer avatar (`image` field) resolved, then higher `objects_core.weight`, then id.
 */
export function sortProjectedObjectsForDisplay(
  items: Array<{ projected: ProjectedObject; weight: number | null }>,
): ProjectedObject[] {
  const sorted = [...items].sort((a, b) => {
    const ha = hasDisplayImage(a.projected) ? 1 : 0;
    const hb = hasDisplayImage(b.projected) ? 1 : 0;
    if (ha !== hb) {
      return hb - ha;
    }
    const wa = a.weight ?? Number.NEGATIVE_INFINITY;
    const wb = b.weight ?? Number.NEGATIVE_INFINITY;
    if (wa !== wb) {
      return wb - wa;
    }
    return a.projected.object_id.localeCompare(b.projected.object_id);
  });
  return sorted.map((x) => x.projected);
}

function applyLinkedDescriptionExcerpt(projected: ProjectedObject): ProjectedObject {
  const desc = projected.fields['description'];
  if (typeof desc !== 'string' || desc === '') {
    return projected;
  }
  const plain = stripHtmlForExcerpt(desc);
  const excerpt = truncateExcerpt(plain, LINKED_OBJECT_DESCRIPTION_MAX);
  return {
    ...projected,
    fields: {
      ...projected.fields,
      description: excerpt,
    },
  };
}

async function projectObjectsForPost(
  objectsForPost: PostObject[],
  viewsByObjectId: Map<string, ResolvedObjectView>,
  weightByObjectId: Map<string, number | null>,
  projection: ObjectProjectionService,
  options: BatchProjectOptions,
): Promise<Array<{ projected: ProjectedObject; weight: number | null }>> {
  const uniqueIds = [...new Set(objectsForPost.map((o) => o.object_id))];
  const viewsToProject = uniqueIds
    .map((id) => viewsByObjectId.get(id))
    .filter((v): v is ResolvedObjectView => v != null);

  const projectedBatch =
    viewsToProject.length > 0 ? await projection.batchProject(viewsToProject, options) : [];
  const projectedById = new Map(projectedBatch.map((p) => [p.object_id, p]));

  return objectsForPost.map((o) => ({
    projected: projectedById.get(o.object_id) ?? placeholderProjectedObject(o),
    weight: weightByObjectId.get(o.object_id) ?? null,
  }));
}

export async function buildFeedObjectChips(
  objectsForPost: PostObject[],
  viewsByObjectId: Map<string, ResolvedObjectView>,
  weightByObjectId: Map<string, number | null>,
  projection: ObjectProjectionService,
  options: BatchProjectOptions,
  limit: number,
): Promise<ProjectedObject[]> {
  const rows = await projectObjectsForPost(
    objectsForPost,
    viewsByObjectId,
    weightByObjectId,
    projection,
    options,
  );
  return sortProjectedObjectsForDisplay(rows).slice(0, limit);
}

export async function buildLinkedObjectSummaries(
  objectsForPost: PostObject[],
  viewsByObjectId: Map<string, ResolvedObjectView>,
  weightByObjectId: Map<string, number | null>,
  projection: ObjectProjectionService,
  options: BatchProjectOptions,
): Promise<ProjectedObject[]> {
  const rows = await projectObjectsForPost(
    objectsForPost,
    viewsByObjectId,
    weightByObjectId,
    projection,
    options,
  );
  const sorted = sortProjectedObjectsForDisplay(rows);
  return sorted.map(applyLinkedDescriptionExcerpt);
}
