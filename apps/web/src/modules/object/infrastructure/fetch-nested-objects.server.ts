import 'server-only';

import { z } from 'zod';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

const RESOLVE_NESTED_PATH = '/query/v1/objects/resolve-nested';

const nestedObjectViewSchema = z.object({
  object_id: z.string(),
  object_type: z.string(),
  fields: z.record(z.string(), z.unknown()),
});

const resolveNestedObjectsResponseSchema = z.object({
  items: z.array(nestedObjectViewSchema),
});

export type NestedObjectViewFromApi = z.infer<typeof nestedObjectViewSchema>;

export async function fetchNestedObjectsBatch(
  ids: string[],
  init: { locale: string; viewer?: string | null },
): Promise<Map<string, NestedObjectViewFromApi>> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Locale': init.locale,
    'Accept-Language': init.locale,
  };
  if (init.viewer != null && init.viewer.trim() !== '') {
    headers['X-Viewer'] = init.viewer.trim();
  }

  const raw = await queryApiFetch<unknown>(RESOLVE_NESTED_PATH, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids: uniqueIds }),
  });

  if (raw == null) {
    return new Map();
  }

  const parsed = resolveNestedObjectsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return new Map();
  }

  const out = new Map<string, NestedObjectViewFromApi>();
  for (const item of parsed.data.items) {
    out.set(item.object_id, item);
  }
  return out;
}
