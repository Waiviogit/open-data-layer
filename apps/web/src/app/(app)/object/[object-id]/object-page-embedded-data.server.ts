import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import type { ObjectPageViewModel } from '@/modules/object';
import {
  getObjectUpdatesFeedPageQuery,
  parseObjectUpdatesSearchParams,
} from '@/modules/object-updates';
import type { ObjectEmbeddedUpdatesFeedModel } from '@/modules/object-updates/embedded-updates-feed.model';

export function buildEmbeddedUpdatesFeedMeta(
  model: ObjectPageViewModel,
  sp: Record<string, string | string[] | undefined>,
): Omit<ObjectEmbeddedUpdatesFeedModel, 'initialPage'> {
  const filters = parseObjectUpdatesSearchParams(sp);
  const registryEntry =
    OBJECT_TYPE_REGISTRY[model.objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
  const supported = registryEntry?.supported_updates ?? [];
  const typeOptions = supported.map((u) => ({
    value: u,
    label: labelForUpdateType(u),
    count: model.updateTypeCounts[u] ?? 0,
  }));
  const showLocaleFilter = supported.some((u) => UPDATE_REGISTRY[u]?.localizable === true);
  const localizableTypes = supported.filter((u) => UPDATE_REGISTRY[u]?.localizable === true);

  return {
    filters,
    typeOptions,
    showLocaleFilter,
    localizableTypes,
  };
}

export async function fetchEmbeddedUpdatesFeed(
  objectId: string,
  model: ObjectPageViewModel,
  sp: Record<string, string | string[] | undefined>,
  init: { locale: string; viewer: string | null },
): Promise<ObjectEmbeddedUpdatesFeedModel> {
  const meta = buildEmbeddedUpdatesFeedMeta(model, sp);
  const initialPage = await getObjectUpdatesFeedPageQuery(
    objectId,
    { filters: meta.filters, cursor: null },
    init,
  );

  return {
    ...meta,
    initialPage,
  };
}
