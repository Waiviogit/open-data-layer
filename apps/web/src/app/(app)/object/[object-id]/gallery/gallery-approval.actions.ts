'use server';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import type { GalleryApprovalStatsIndex } from '@/modules/object/domain/gallery-approval-stats';
import { loadGalleryApprovalStatsIndex } from '@/modules/object/infrastructure/gallery-approval-stats.server';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function fetchGalleryApprovalStatsAction(
  objectId: string,
): Promise<GalleryApprovalStatsIndex> {
  const locale = await getRequestLocale();
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();

  return loadGalleryApprovalStatsIndex(objectId, {
    locale,
    viewer: user?.username ?? null,
  });
}
