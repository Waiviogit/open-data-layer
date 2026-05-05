import { Injectable } from '@nestjs/common';
import { AccountsCurrentRepository, UserSubscriptionsRepository } from '../../repositories';
import type { UserSocialListQuery } from './user-social-list.schema';
import type { PaginatedUserFollowList, UserFollowListItem } from './user-follow-list.types';

@Injectable()
export class GetUserFollowingEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly subscriptions: UserSubscriptionsRepository,
  ) {}

  async execute(
    username: string,
    query: UserSocialListQuery,
    viewerAccount: string | undefined,
  ): Promise<PaginatedUserFollowList | null> {
    const name = username.trim();
    if (name.length === 0) {
      return null;
    }

    const row = await this.accounts.findByName(name);
    if (!row) {
      return null;
    }

    const [total, followingAccounts] = await Promise.all([
      this.subscriptions.countFollowingBy(name),
      this.subscriptions.findAccountsFollowedBy(name, query.sort, query.skip, query.limit),
    ]);

    const accountNames = followingAccounts.map((r) => r.name);
    const viewer = viewerAccount?.trim();
    const followedByViewer =
      viewer && viewer.length > 0
        ? new Set(await this.subscriptions.listFollowedSubset(viewer, accountNames))
        : new Set<string>();

    const items: UserFollowListItem[] = followingAccounts.map((r) => ({
      name: r.name,
      avatarUrl: r.profile_image,
      wobjectsWeight: r.wobjects_weight,
      usersFollowingCount: r.users_following_count,
      isCurrentFollowing: followedByViewer.has(r.name),
    }));

    return {
      items,
      total,
      hasMore: query.skip + items.length < total,
    };
  }
}
