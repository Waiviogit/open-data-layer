import 'server-only';

import { z } from 'zod';

import { affiliateLinkViewSchema } from '@/modules/feed/application/dto/feed-story.dto';
import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

import type { ObjectRefCardView } from '../domain/object-page.types';
import {
  projectedObjectToRefCard,
  refSummaryToProjectedObjectView,
  RIGHT_RAIL_REF_FETCH_LIMIT,
} from './object-ref-list.client';

const refSummarySchema = z.object({
  object_id: z.string(),
  object_type: z.string(),
  fields: z.record(z.string(), z.unknown()),
  weight: z.number().nullable().optional(),
  isFavorited: z.boolean().optional(),
  affiliateLinks: z.array(affiliateLinkViewSchema).optional(),
});

const fieldReferenceGroupSchema = z.object({
  objectType: z.string(),
  items: z.array(refSummarySchema),
  hasMore: z.boolean(),
});

const fieldReferencesSummaryResponseSchema = z.object({
  groups: z.array(fieldReferenceGroupSchema),
});

const fieldReferencesByTypeResponseSchema = z.object({
  items: z.array(refSummarySchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
});

export type ObjectFieldReferenceGroupView = {
  objectType: string;
  items: ObjectRefCardView[];
  hasMore: boolean;
};

export type ObjectFieldReferencesPageView = {
  items: ProjectedObjectView[];
  hasMore: boolean;
  cursor: string | null;
};

export { RIGHT_RAIL_REF_FETCH_LIMIT as FIELD_REFERENCES_RAIL_FETCH_LIMIT };

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

function buildHeaders(init?: { locale?: string; viewer?: string | null }): Record<string, string> {
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
  return headers;
}

export async function fetchObjectFieldReferencesSummary(
  objectId: string,
  args: { limit?: number },
  init?: { locale?: string; viewer?: string | null },
): Promise<ObjectFieldReferenceGroupView[] | null> {
  const qs = buildQuery({ limit: args.limit ?? RIGHT_RAIL_REF_FETCH_LIMIT });
  const path = `/query/v1/objects/${encodeURIComponent(objectId)}/field-references${qs}`;
  const raw = await queryApiFetch<unknown>(path, { headers: buildHeaders(init) });
  if (raw == null) {
    return null;
  }

  const parsed = fieldReferencesSummaryResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.groups.map((group) => ({
    objectType: group.objectType,
    items: group.items.map((item) =>
      projectedObjectToRefCard(refSummaryToProjectedObjectView(item)),
    ),
    hasMore: group.hasMore,
  }));
}

export async function fetchObjectFieldReferencesByType(
  objectId: string,
  referenceObjectType: string,
  args: { limit: number; cursor?: string | null },
  init?: { locale?: string; viewer?: string | null },
): Promise<ObjectFieldReferencesPageView | null> {
  const qs = buildQuery({
    limit: args.limit,
    cursor: args.cursor ?? undefined,
  });
  const path = `/query/v1/objects/${encodeURIComponent(objectId)}/field-references/${encodeURIComponent(referenceObjectType)}${qs}`;
  const raw = await queryApiFetch<unknown>(path, { headers: buildHeaders(init) });
  if (raw == null) {
    return null;
  }

  const parsed = fieldReferencesByTypeResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return {
    items: parsed.data.items.map(refSummaryToProjectedObjectView),
    hasMore: parsed.data.hasMore,
    cursor: parsed.data.cursor,
  };
}
