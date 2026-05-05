import {
  paginatedUserFollowListSchema,
  type PaginatedUserFollowListView,
  type UserSubscriptionSort,
} from '../dto/user-social.dto';
import { fetchUserFollowers } from '../../infrastructure/clients/user-social.client';

export async function getUserFollowersPageQuery(
  accountName: string,
  args: { sort: UserSubscriptionSort; skip: number; limit: number },
  viewer?: string | null,
): Promise<PaginatedUserFollowListView> {
  const raw = await fetchUserFollowers(accountName, args, { viewer });
  if (raw === null) {
    return { items: [], total: 0, hasMore: false };
  }
  const parsed = paginatedUserFollowListSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[getUserFollowersPageQuery] unexpected response shape:',
      parsed.error.flatten(),
    );
    return { items: [], total: 0, hasMore: false };
  }
  return parsed.data;
}
