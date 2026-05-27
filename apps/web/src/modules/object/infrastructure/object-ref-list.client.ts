import 'server-only';

import { z } from 'zod';

import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import { objectFields } from '@/modules/feed/application/dto/object-fields';
import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

import type { ObjectRefCardView } from '../domain/object-page.types';

export type ObjectRefRelation = 'related' | 'similar' | 'add-on';

/** Center-column ref list page size (SSR + load-more). */
export const REF_LIST_PAGE_SIZE = 20;

/** Right-rail preview fetch size — one extra row to detect `hasMore` when count > 5. */
export const RIGHT_RAIL_REF_FETCH_LIMIT = 6;

const refSummarySchema = z.object({
  object_id: z.string(),
  object_type: z.string(),
  fields: z.record(z.string(), z.unknown()),
  weight: z.number().nullable().optional(),
  hasAdministrativeAuthority: z.boolean().optional(),
});

const objectRefListResponseSchema = z.object({
  items: z.array(refSummarySchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
});

export type ObjectRefListPageView = {
  items: ProjectedObjectView[];
  hasMore: boolean;
  cursor: string | null;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      continue;
    }
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export function refSummaryToProjectedObjectView(
  ref: z.infer<typeof refSummarySchema>,
): ProjectedObjectView {
  return {
    object_id: ref.object_id,
    object_type: ref.object_type,
    semantic_type: null,
    weight: ref.weight ?? null,
    fields: ref.fields,
    hasAdministrativeAuthority: ref.hasAdministrativeAuthority ?? false,
    hasOwnershipAuthority: false,
  };
}

export function projectedObjectToRefCard(o: ProjectedObjectView): ObjectRefCardView {
  const name = objectFields.name(o)?.trim();
  return {
    objectId: o.object_id,
    title: name && name.length > 0 ? name : o.object_id,
    imageSrc: objectFields.image(o) ?? null,
    objectType: o.object_type,
  };
}

export async function fetchObjectRefList(
  objectId: string,
  relation: ObjectRefRelation,
  args: { limit: number; cursor?: string | null },
  init?: { locale?: string; viewer?: string | null },
): Promise<ObjectRefListPageView | null> {
  const qs = buildQuery({
    limit: args.limit,
    cursor: args.cursor ?? undefined,
  });
  const path = `/query/v1/objects/${encodeURIComponent(objectId)}/${relation}${qs}`;
  const headers: Record<string, string> = {};
  const locale = init?.locale?.trim();
  if (locale) {
    headers['Accept-Language'] = locale;
    headers['X-Locale'] = locale;
  }
  const viewer = init?.viewer?.trim();
  if (viewer) {
    headers['X-Viewer'] = viewer;
  }

  const raw = await queryApiFetch<unknown>(path, { headers });
  if (raw == null) {
    return null;
  }

  const parsed = objectRefListResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return {
    items: parsed.data.items.map(refSummaryToProjectedObjectView),
    hasMore: parsed.data.hasMore,
    cursor: parsed.data.cursor,
  };
}
