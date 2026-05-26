import 'server-only';

import { objectFields } from '@/modules/feed/application/dto/object-fields';
import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import type { ObjectNestedViewResolved, ObjectSwitcherKind } from '../domain/object-page.types';
import { fetchNestedObjectsBatch } from './fetch-nested-objects.server';
import {
  applySortCustomToListItems,
  projectedListItems,
  projectedPageContent,
  projectedSortCustom,
} from './object-projected-fields';
import { sanitizePostHtml } from '@/shared/infrastructure/sanitize-post-html';

const SWITCHER_KINDS = new Set<ObjectSwitcherKind>([
  'list',
  'page',
  'newsfeed',
  'widget',
  'webpage',
  'map',
  'shop',
  'group',
  'default',
]);

function toSwitcherKind(objectType: string): ObjectSwitcherKind {
  return SWITCHER_KINDS.has(objectType as ObjectSwitcherKind)
    ? (objectType as ObjectSwitcherKind)
    : 'default';
}

function toViewLike(
  objectId: string,
  objectType: string,
  fields: Record<string, unknown>,
): ProjectedObjectView {
  return {
    object_id: objectId,
    object_type: objectType,
    semantic_type: null,
    weight: null,
    fields,
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
  };
}

function nestedViewFromApi(
  api: { object_id: string; object_type: string; fields: Record<string, unknown> },
): ObjectNestedViewResolved {
  const fields = api.fields ?? {};
  const viewLike = toViewLike(api.object_id, api.object_type, fields);
  const sortCustom = projectedSortCustom(viewLike);
  const listItems = applySortCustomToListItems(projectedListItems(viewLike), sortCustom);
  const pageContent = projectedPageContent(viewLike);
  const name = objectFields.name(viewLike)?.trim() || api.object_id;
  const objectType = toSwitcherKind(api.object_type);

  return {
    objectId: api.object_id,
    name,
    objectType,
    listItems,
    listItemsSortCustom: sortCustom,
    pageContentHtml: pageContent ? sanitizePostHtml(pageContent) : null,
  };
}

export async function resolveNestedObjectContent(
  objectId: string,
  init: { locale: string; viewer?: string | null },
): Promise<ObjectNestedViewResolved | null> {
  const batch = await fetchNestedObjectsBatch([objectId], init);
  const api = batch.get(objectId);
  if (!api) {
    return null;
  }
  return nestedViewFromApi(api);
}

export async function resolveNestedObjectPath(
  pathIds: string[],
  init: { locale: string; viewer?: string | null },
): Promise<ObjectNestedViewResolved[]> {
  if (pathIds.length === 0) {
    return [];
  }
  const batch = await fetchNestedObjectsBatch(pathIds, init);
  const stack: ObjectNestedViewResolved[] = [];
  for (const id of pathIds) {
    const api = batch.get(id);
    if (!api) {
      break;
    }
    stack.push(nestedViewFromApi(api));
  }
  return stack;
}
