import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

import {
  projectedObjectWithCountsSchema,
  type ProjectedObjectWithCountsView,
} from './object-resolve.types';

const RESOLVE_PATH = '/query/v1/objects/resolve';

export async function fetchProjectedObjectWithCounts(
  objectId: string,
  init: { locale: string; viewer?: string | null },
): Promise<ProjectedObjectWithCountsView | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Locale': init.locale,
    'Accept-Language': init.locale,
  };
  if (init.viewer != null && init.viewer.trim() !== '') {
    headers['X-Viewer'] = init.viewer.trim();
  }

  const raw = await queryApiFetch<unknown>(RESOLVE_PATH, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      object_id: objectId,
      update_types: [],
    }),
  });

  if (raw == null) {
    return null;
  }

  const parsed = projectedObjectWithCountsSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
