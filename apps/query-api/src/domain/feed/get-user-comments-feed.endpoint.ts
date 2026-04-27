import { Injectable } from '@nestjs/common';
import { HiveClient } from '@opden-data-layer/clients';
import type { HiveContentType } from '@opden-data-layer/clients';

import { AccountsCurrentRepository } from '../../repositories';
import { mapAccountToUserProfileView } from '../users/account-mapper';
import { decodeFeedCursor, encodeFeedCursor } from './feed-cursor';
import type { FeedStoryItemDto, UserBlogFeedResponse } from './feed-story-dtos';
import { mapHiveContentToFeedStoryItemDto } from './map-hive-content-to-feed-story-item.dto';
import type { UserThreadsFeedBody } from './schemas/user-threads-feed.schema';

/** Same as legacy Waivio: skip Leo Threads app comments, keep paging Hive until the page is filled. */
const LEO_THREADS_PARENT = 'leothreads';

const COMMENTS_FEED_MAX_HIVE_ROUND_TRIPS = 40;

/** Hive nodes reject limit > 20 (`Assert Exception: limit outside valid range [1:20]`). */
const HIVE_DISCUSSIONS_BY_COMMENTS_MAX_LIMIT = 20;

/** Raw batch size per Hive call (max 20); larger values fail the RPC and yield an empty result. */
function commentsFeedHivePageLimit(requestedPageSize: number): number {
  const target = Math.max(requestedPageSize + 1, 15);
  return Math.min(HIVE_DISCUSSIONS_BY_COMMENTS_MAX_LIMIT, target);
}

function isLeoThreadsComment(content: HiveContentType): boolean {
  if (content.parent_author?.trim().toLowerCase() === LEO_THREADS_PARENT) {
    return true;
  }
  const u = content.url ?? '';
  return u.toLowerCase().includes('leothreads');
}

@Injectable()
export class GetUserCommentsFeedEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly hiveClient: HiveClient,
  ) {}

  async execute(
    profileAccountName: string,
    body: UserThreadsFeedBody,
    viewerAccount?: string,
  ): Promise<UserBlogFeedResponse | null> {
    const accountRow = await this.accounts.findByName(profileAccountName);
    if (!accountRow) {
      return null;
    }

    const limit = body.limit;
    const targetFilteredCount = limit + 1;
    const hivePageLimit = commentsFeedHivePageLimit(limit);
    const cursorPayload = body.cursor ? decodeFeedCursor(body.cursor) : null;
    if (body.cursor && !cursorPayload) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }
    if (
      cursorPayload &&
      cursorPayload.author.trim().toLowerCase() !== profileAccountName.trim().toLowerCase()
    ) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }

    let hiveAnchor: string | undefined = cursorPayload?.permlink?.trim() || undefined;
    const filtered: HiveContentType[] = [];

    for (let round = 0; round < COMMENTS_FEED_MAX_HIVE_ROUND_TRIPS; round++) {
      if (filtered.length >= targetFilteredCount) {
        break;
      }

      const batch = await this.hiveClient.getDiscussionsByComments({
        start_author: profileAccountName,
        start_permlink: hiveAnchor,
        limit: hivePageLimit,
      });

      if (batch.length === 0) {
        break;
      }

      const lastRawPermlink = batch[batch.length - 1]?.permlink;
      if (!lastRawPermlink?.trim()) {
        break;
      }

      let rest = batch;
      if (
        hiveAnchor &&
        rest[0]?.permlink?.trim().toLowerCase() === hiveAnchor.trim().toLowerCase()
      ) {
        rest = rest.slice(1);
      }

      hiveAnchor = lastRawPermlink.trim();

      if (rest.length === 0) {
        continue;
      }

      for (const row of rest) {
        if (!isLeoThreadsComment(row)) {
          filtered.push(row);
          if (filtered.length >= targetFilteredCount) {
            break;
          }
        }
      }
    }

    const hasMore = filtered.length > limit;
    const pageRows = hasMore ? filtered.slice(0, limit) : filtered;

    const profile = mapAccountToUserProfileView(accountRow);
    const authorProfile: FeedStoryItemDto['authorProfile'] = {
      name: profile.name,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      reputation: profile.reputation,
    };

    const items: FeedStoryItemDto[] = pageRows.map((c) =>
      mapHiveContentToFeedStoryItemDto(c, authorProfile, viewerAccount),
    );

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      const createdRaw = last.created?.trim() ?? '';
      const feedAtSec =
        createdRaw !== '' ? Math.floor(Date.parse(createdRaw) / 1000) : 0;
      nextCursor = encodeFeedCursor({
        feedAt: Number.isFinite(feedAtSec) ? feedAtSec : 0,
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
