import 'server-only';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { ObjectUpdateFeedItemView } from '@/modules/object-updates/application/dto/object-updates-feed.dto';
import { objectUpdatesFeedResponseSchema } from '@/modules/object-updates/application/dto/object-updates-feed.dto';
import { fetchObjectUpdatesFeed } from '@/modules/object-updates/infrastructure/clients/object-updates.client';

import type { GalleryApprovalStat, GalleryApprovalStatsIndex } from '../domain/gallery-approval-stats';
import { normalizeGalleryImageUrl } from '../domain/gallery-approval-stats';

/** query-api `/updates` accepts at most 50 rows per page. */
const GALLERY_APPROVAL_PAGE_LIMIT = 50;

/** Safety cap: approval sort loads all rows server-side; paginate client-side fetches. */
const GALLERY_APPROVAL_MAX_PAGES = 20;

const GALLERY_APPROVAL_UPDATE_TYPES = [
  UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  /** Synthetic Photos-album avatar row uses the winning `image` update URL. */
  UPDATE_TYPES.IMAGE,
] as const;

function readImageJsonUrl(valueJson: unknown): string | null {
  if (valueJson == null || typeof valueJson !== 'object' || Array.isArray(valueJson)) {
    return null;
  }
  const url = (valueJson as Record<string, unknown>).url;
  if (typeof url !== 'string') {
    return null;
  }
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function collectFeedItemUrls(item: ObjectUpdateFeedItemView): string[] {
  return [
    readImageJsonUrl(item.value_json),
    ...item.image_preview_urls,
  ].filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
}

function indexGalleryApprovalStat(
  byUpdateId: Record<string, GalleryApprovalStat>,
  byUrl: Record<string, GalleryApprovalStat>,
  updateId: string,
  stat: GalleryApprovalStat,
  urls: readonly string[],
): void {
  byUpdateId[updateId] = stat;
  for (const rawUrl of urls) {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      continue;
    }
    byUrl[trimmed] = stat;
    byUrl[normalizeGalleryImageUrl(trimmed)] = stat;
  }
}

async function mergeUpdateTypeIntoIndex(
  objectId: string,
  init: { locale: string; viewer?: string | null },
  updateType: string,
  byUpdateId: Record<string, GalleryApprovalStat>,
  byUrl: Record<string, GalleryApprovalStat>,
): Promise<void> {
  let cursor: string | null = null;
  for (let page = 0; page < GALLERY_APPROVAL_MAX_PAGES; page += 1) {
    const raw = await fetchObjectUpdatesFeed({
      objectId,
      locale: init.locale,
      viewer: init.viewer ?? null,
      update_type: updateType,
      sort: 'approval',
      limit: GALLERY_APPROVAL_PAGE_LIMIT,
      cursor,
    });

    if (raw == null) {
      break;
    }

    const parsed = objectUpdatesFeedResponseSchema.safeParse(raw);
    if (!parsed.success) {
      break;
    }

    for (const item of parsed.data.items) {
      const stat: GalleryApprovalStat = {
        approvePercent: item.approve_percent,
        forCount: item.for_vote_count,
        againstCount: item.against_vote_count,
      };
      indexGalleryApprovalStat(
        byUpdateId,
        byUrl,
        item.update_id,
        stat,
        collectFeedItemUrls(item),
      );
    }

    if (!parsed.data.hasMore || !parsed.data.cursor) {
      break;
    }
    cursor = parsed.data.cursor;
  }
}

export async function loadGalleryApprovalStatsIndex(
  objectId: string,
  init: { locale: string; viewer?: string | null },
): Promise<GalleryApprovalStatsIndex> {
  const byUpdateId: Record<string, GalleryApprovalStat> = {};
  const byUrl: Record<string, GalleryApprovalStat> = {};

  for (const updateType of GALLERY_APPROVAL_UPDATE_TYPES) {
    await mergeUpdateTypeIntoIndex(objectId, init, updateType, byUpdateId, byUrl);
  }

  return { byUpdateId, byUrl };
}
