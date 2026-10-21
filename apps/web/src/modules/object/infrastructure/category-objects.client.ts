import 'server-only';

import { z } from 'zod';

import { affiliateLinkViewSchema } from '@/modules/feed/application/dto/feed-story.dto';
import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

import {
  refSummaryToProjectedObjectView,
  REF_LIST_PAGE_SIZE,
} from './object-ref-list.client';

export { REF_LIST_PAGE_SIZE };

const refSummarySchema = z.object({
  object_id: z.string(),
  object_type: z.string(),
  fields: z.record(z.string(), z.unknown()),
  weight: z.coerce.number().nullable().optional(),
  isFavorited: z.boolean().optional(),
  affiliateLinks: z.array(affiliateLinkViewSchema).optional(),
});

const categoryObjectsResponseSchema = z.object({
  items: z.array(refSummarySchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
});

export type CategoryObjectsPageView = {
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

export async function fetchCategoryObjects(
  args: {
    name: string;
    limit: number;
    cursor?: string | null;
    excludeObjectId?: string | null;
  },
  init?: { locale?: string; viewer?: string | null },
): Promise<CategoryObjectsPageView | null> {
  const name = args.name.trim();
  if (name.length === 0) {
    return null;
  }

  const qs = buildQuery({
    name,
    limit: args.limit,
    cursor: args.cursor ?? undefined,
    exclude_object_id: args.excludeObjectId?.trim() || undefined,
  });
  const path = `/query/v1/categories/objects${qs}`;
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

  const parsed = categoryObjectsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return {
    items: parsed.data.items.map(refSummaryToProjectedObjectView),
    hasMore: parsed.data.hasMore,
    cursor: parsed.data.cursor,
  };
}
