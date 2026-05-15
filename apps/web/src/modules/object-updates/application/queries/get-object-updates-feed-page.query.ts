import {
  objectUpdatesFeedResponseSchema,
  type ObjectUpdatesFeedPageView,
} from '../dto/object-updates-feed.dto';
import { fetchObjectUpdatesFeed } from '../../infrastructure/clients/object-updates.client';
import { OBJECT_UPDATES_PAGE_SIZE } from '../../constants';
import type { ObjectUpdatesUrlFilters } from '../parse-object-updates-search-params';

const EMPTY_PAGE: ObjectUpdatesFeedPageView = {
  items: [],
  cursor: null,
  hasMore: false,
};

export async function getObjectUpdatesFeedPageQuery(
  objectId: string,
  args: { filters: ObjectUpdatesUrlFilters; cursor?: string | null },
  init: { locale: string; viewer?: string | null },
): Promise<ObjectUpdatesFeedPageView> {
  const raw = await fetchObjectUpdatesFeed({
    objectId,
    locale: init.locale,
    viewer: init.viewer,
    cursor: args.cursor ?? undefined,
    limit: OBJECT_UPDATES_PAGE_SIZE,
    update_type: args.filters.update_type,
    updateLocale: args.filters.locale,
    sort: args.filters.sort,
  });

  if (raw == null) {
    return EMPTY_PAGE;
  }

  const parsed = objectUpdatesFeedResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[getObjectUpdatesFeedPageQuery] unexpected response shape:',
      parsed.error.flatten(),
    );
    return EMPTY_PAGE;
  }

  return parsed.data;
}
