'use server';

import { queryApiFetchLive } from '@/modules/user-profile/infrastructure/clients/query-api.client';

export async function checkObjectIdExists(
  objectId: string,
): Promise<boolean | null> {
  const trimmed = objectId.trim();
  if (trimmed.length < 2) {
    return null;
  }
  const res = await queryApiFetchLive<{ exists: boolean }>(
    `/query/v1/objects/${encodeURIComponent(trimmed)}/exists`,
  );
  if (res == null) {
    return null;
  }
  return res.exists;
}
