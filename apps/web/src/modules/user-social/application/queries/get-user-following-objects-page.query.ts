import {
  paginatedFollowingObjectsSchema,
  type PaginatedFollowingObjectsView,
  type UserObjectListSort,
} from '../dto/user-social.dto';
import { fetchUserFollowingObjects } from '../../infrastructure/clients/user-social.client';

export async function getUserFollowingObjectsPageQuery(
  accountName: string,
  args: { sort: UserObjectListSort; skip: number; limit: number },
  locale: string,
  viewer?: string | null,
): Promise<PaginatedFollowingObjectsView> {
  const raw = await fetchUserFollowingObjects(accountName, args, locale, { viewer });
  if (raw === null) {
    return { items: [], total: 0, hasMore: false };
  }
  const parsed = paginatedFollowingObjectsSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[getUserFollowingObjectsPageQuery] unexpected response shape:',
      parsed.error.flatten(),
    );
    return { items: [], total: 0, hasMore: false };
  }
  return parsed.data;
}
