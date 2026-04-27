import { Injectable } from '@nestjs/common';
import type { Post } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  AccountsCurrentRepository,
  PostsRepository,
  type FeedBranchRow,
} from '../../repositories';
import { mapAccountToUserProfileView } from '../users/account-mapper';
import type { UserProfileView } from '../users/user-profile.types';
import { GovernanceResolverService } from '../governance';
import { decodeFeedCursor, encodeFeedCursor } from './feed-cursor';
import { buildFeedObjectChips } from './feed-object-summaries';
import { ObjectProjectionService } from '../object-projection';
import { FEED_OBJECT_UPDATE_TYPES, FEED_TAGGED_OBJECT_DISPLAY_LIMIT } from './feed.constants';
import type { FeedStoryItemDto, UserBlogFeedResponse } from './feed-story-dtos';
import { stripHtmlForExcerpt, truncateExcerpt } from './post-excerpt';
import { extractThumbnailUrl } from './post-thumbnail';
import { extractVideoEmbedUrl, extractVideoThumbnailUrl } from './post-video-thumbnail';
import { isNsfwPost } from './post-nsfw';
import type { UserBlogFeedBody } from './schemas/user-blog-feed.schema';

export type { FeedStoryItemDto, FeedVoteSummaryDto, UserBlogFeedResponse } from './feed-story-dtos';

@Injectable()
export class GetUserBlogFeedEndpoint {
  constructor(
    private readonly postsRepo: PostsRepository,
    private readonly accounts: AccountsCurrentRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectProjection: ObjectProjectionService,
  ) {}

  async execute(
    accountName: string,
    body: UserBlogFeedBody,
    locale: string,
    governanceObjectIdFromHeader?: string,
    viewerAccount?: string,
  ): Promise<UserBlogFeedResponse | null> {
    const accountRow = await this.accounts.findByName(accountName);
    if (!accountRow) {
      return null;
    }

    const limit = body.limit;
    const limitPlusOne = limit + 1;
    const cursorPayload = body.cursor ? decodeFeedCursor(body.cursor) : null;
    if (body.cursor && !cursorPayload) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }

    const feedRows = await this.postsRepo.findUserBlogFeed(
      accountName,
      cursorPayload,
      limitPlusOne,
    );

    const hasMore = feedRows.length > limit;
    const pageRows: FeedBranchRow[] = hasMore ? feedRows.slice(0, limit) : feedRows;

    if (pageRows.length === 0) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }

    const keys = pageRows.map((r) => ({ author: r.author, permlink: r.permlink }));
    const [postRows, postObjects, voteMap] = await Promise.all([
      this.postsRepo.findPostsByKeys(keys),
      this.postsRepo.findPostObjectsByKeys(keys),
      this.postsRepo.findActiveVoteSummaries(keys, viewerAccount),
    ]);

    const postByKey = new Map<string, Post>();
    for (const p of postRows) {
      postByKey.set(`${p.author}\0${p.permlink}`, p);
    }

    const authorNames = [...new Set(pageRows.map((r) => r.author))];
    const accountRows = await this.accounts.findByNames(authorNames);
    const profileByName = new Map<string, UserProfileView>();
    for (const row of accountRows) {
      profileByName.set(row.name, mapAccountToUserProfileView(row));
    }

    const objectIds = [...new Set(postObjects.map((o) => o.object_id))];
    const governance = await this.governanceResolver.resolveMergedForObjectView(
      governanceObjectIdFromHeader,
    );

    let viewsByObjectId = new Map<string, ResolvedObjectView>();
    const weightByObjectId = new Map<string, number | null>();
    if (objectIds.length > 0) {
      const { objects, voterReputations } = await this.aggregatedObjectRepo.loadByObjectIds(objectIds);
      for (const o of objects) {
        weightByObjectId.set(o.core.object_id, o.core.weight);
      }
      const views = this.objectViewService.resolve(objects, voterReputations, {
        update_types: [...FEED_OBJECT_UPDATE_TYPES],
        locale,
        include_rejected: false,
        governance,
      });
      viewsByObjectId = new Map(views.map((v, i) => [objects[i].core.object_id, v]));
    }

    const items: FeedStoryItemDto[] = [];
    for (const row of pageRows) {
      const pk = `${row.author}\0${row.permlink}`;
      const post = postByKey.get(pk);
      if (!post) {
        throw new Error(`Post row missing for feed key ${row.author}/${row.permlink}`);
      }

      const profile = profileByName.get(row.author);
      const authorProfile = profile
        ? {
            name: profile.name,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            reputation: profile.reputation,
          }
        : {
            name: row.author,
            displayName: null,
            avatarUrl: null,
            reputation: 0,
          };

      const excerpt = truncateExcerpt(stripHtmlForExcerpt(post.body ?? ''));
      const votes = voteMap.get(pk) ?? { totalCount: 0, previewVoters: [], voted: false };

      const objectsForPost = postObjects.filter(
        (o) => o.author === row.author && o.permlink === row.permlink,
      );
      const objects = await buildFeedObjectChips(
        objectsForPost,
        viewsByObjectId,
        weightByObjectId,
        this.objectProjection,
        {
          locale,
          governanceObjectIdFromHeader,
          viewerAccount,
        },
        FEED_TAGGED_OBJECT_DISPLAY_LIMIT,
      );

      items.push({
        id: `${row.author}/${row.permlink}`,
        author: row.author,
        permlink: row.permlink,
        title: post.title ?? '',
        excerpt,
        createdAt: new Date(post.created_unix * 1000).toISOString(),
        feedAt: new Date(row.feed_at * 1000).toISOString(),
        rebloggedBy: row.reblogged_by,
        isNsfw: isNsfwPost(post.json_metadata ?? '', post.category),
        category: post.category,
        children: post.children,
        pendingPayout: post.pending_payout_value ?? '',
        totalPayout: post.total_payout_value ?? '',
        netRshares: String(post.net_rshares),
        thumbnailUrl: extractThumbnailUrl(post.json_metadata ?? '', post.body ?? ''),
        videoThumbnailUrl: extractVideoThumbnailUrl(post.json_metadata ?? '', post.body ?? ''),
        videoEmbedUrl: extractVideoEmbedUrl(post.json_metadata ?? '', post.body ?? '', {
          author: post.author,
          permlink: post.permlink,
        }),
        authorProfile,
        objects,
        votes: {
          totalCount: votes.totalCount,
          previewVoters: votes.previewVoters,
          voted: votes.voted,
        },
      });
    }

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      nextCursor = encodeFeedCursor({
        feedAt: Number(last.feed_at),
        author: last.author,
        permlink: last.permlink,
      });
    }

    return {
      items,
      cursor: nextCursor,
      hasMore,
    };
  }
}
