/**
 * Paginated follower / following account row returned by query-api social endpoints.
 */
export interface UserFollowListItem {
  name: string;
  avatarUrl: string | null;
  wobjectsWeight: number;
  usersFollowingCount: number;
  isCurrentFollowing: boolean;
}

export interface PaginatedUserFollowList {
  items: UserFollowListItem[];
  total: number;
  hasMore: boolean;
}
