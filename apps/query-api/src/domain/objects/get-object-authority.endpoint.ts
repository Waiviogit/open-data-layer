import { Injectable } from '@nestjs/common';
import {
  ObjectsCoreRepository,
  ObjectAuthorityRepository,
  UserSubscriptionsRepository,
} from '../../repositories';
import type { ObjectAuthorityQuery, UserSocialListQuery } from '../social/user-social-list.schema';
import type { PaginatedUserFollowList, UserFollowListItem } from '../social/user-follow-list.types';

@Injectable()
export class GetObjectAuthorityEndpoint {
  constructor(
    private readonly objectsCore: ObjectsCoreRepository,
    private readonly objectAuthority: ObjectAuthorityRepository,
    private readonly subscriptions: UserSubscriptionsRepository,
  ) {}

  async execute(
    objectId: string,
    query: ObjectAuthorityQuery,
    viewerAccount: string | undefined,
  ): Promise<PaginatedUserFollowList | null> {
    const id = objectId.trim();
    if (id.length === 0) {
      return null;
    }

    const core = await this.objectsCore.findByObjectId(id);
    if (!core) {
      return null;
    }

    const socialQuery: UserSocialListQuery = {
      sort: query.sort,
      skip: query.skip,
      limit: query.limit,
    };

    const [total, rows] = await Promise.all([
      this.objectAuthority.countByObjectIdAndType(id, query.authority_type),
      this.objectAuthority.findAccountsByObjectIdAndType(
        id,
        query.authority_type,
        socialQuery.sort,
        socialQuery.skip,
        socialQuery.limit,
      ),
    ]);

    const accountNames = rows.map((r) => r.name);
    const viewer = viewerAccount?.trim();
    const followedByViewer =
      viewer && viewer.length > 0
        ? new Set(await this.subscriptions.listFollowedSubset(viewer, accountNames))
        : new Set<string>();

    const items: UserFollowListItem[] = rows.map((r) => ({
      name: r.name,
      avatarUrl: r.profile_image,
      wobjectsWeight: r.wobjects_weight,
      usersFollowingCount: r.users_following_count,
      isCurrentFollowing: followedByViewer.has(r.name),
    }));

    return {
      items,
      total,
      hasMore: socialQuery.skip + items.length < total,
    };
  }
}
