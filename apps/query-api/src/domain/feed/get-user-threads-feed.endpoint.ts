import { Injectable } from '@nestjs/common';
import type { Thread } from '@opden-data-layer/core';
import {
  AccountsCurrentRepository,
  ThreadsRepository,
  UserAccountMutesRepository,
} from '../../repositories';
import { mapAccountToUserProfileView } from '../users/account-mapper';
import type { UserProfileView } from '../users/user-profile.types';
import { decodeFeedCursor, encodeFeedCursor } from './feed-cursor';
import type { FeedStoryItemDto, UserBlogFeedResponse } from './feed-story-dtos';
import { stripHtmlForExcerpt, truncateExcerpt } from './post-excerpt';
import { extractThumbnailUrl } from './post-thumbnail';
import { extractVideoEmbedUrl, extractVideoThumbnailUrl } from './post-video-thumbnail';
import type { UserThreadsFeedBody } from './schemas/user-threads-feed.schema';

function threadCreatedIso(thread: Thread): string {
  const raw = thread.created?.trim();
  if (raw) {
    const ms = Date.parse(raw);
    if (!Number.isNaN(ms)) {
      return new Date(ms).toISOString();
    }
  }
  return new Date(thread.created_unix * 1000).toISOString();
}

@Injectable()
export class GetUserThreadsFeedEndpoint {
  constructor(
    private readonly threadsRepo: ThreadsRepository,
    private readonly accounts: AccountsCurrentRepository,
    private readonly userAccountMutesRepo: UserAccountMutesRepository,
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
    const limitPlusOne = limit + 1;
    const cursorPayload = body.cursor ? decodeFeedCursor(body.cursor) : null;
    if (body.cursor && !cursorPayload) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }

    const viewerTrimmed = viewerAccount?.trim() ?? '';
    const mutedAuthors =
      viewerTrimmed.length > 0
        ? await this.userAccountMutesRepo.listMutedForMuters([viewerTrimmed])
        : [];

    const threadRows = await this.threadsRepo.findUserThreadsFeed(
      profileAccountName,
      mutedAuthors,
      cursorPayload,
      body.sort,
      limitPlusOne,
    );

    const hasMore = threadRows.length > limit;
    const pageRows: Thread[] = hasMore ? threadRows.slice(0, limit) : threadRows;

    if (pageRows.length === 0) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }

    const keys = pageRows.map((r) => ({ author: r.author, permlink: r.permlink }));
    const voteMap = await this.threadsRepo.findThreadActiveVoteSummaries(keys, viewerAccount);

    const authorNames = [...new Set(pageRows.map((r) => r.author))];
    const accountRows = await this.accounts.findByNames(authorNames);
    const profileByName = new Map<string, UserProfileView>();
    for (const row of accountRows) {
      profileByName.set(row.name, mapAccountToUserProfileView(row));
    }

    const items: FeedStoryItemDto[] = [];
    for (const thread of pageRows) {
      const pk = `${thread.author}\0${thread.permlink}`;
      const profile = profileByName.get(thread.author);
      const authorProfile = profile
        ? {
            name: profile.name,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            reputation: profile.reputation,
          }
        : {
            name: thread.author,
            displayName: null,
            avatarUrl: null,
            reputation: 0,
          };

      const bodyText = thread.body ?? '';
      const excerpt = truncateExcerpt(stripHtmlForExcerpt(bodyText));
      const votes = voteMap.get(pk) ?? { totalCount: 0, previewVoters: [], voted: false };

      const createdAtFromChain = threadCreatedIso(thread);
      const feedAt = createdAtFromChain;

      const firstImage = thread.images?.[0] ?? null;
      const thumbnailFromBody = extractThumbnailUrl('', bodyText);
      const thumbnailUrl = firstImage?.trim() ? firstImage : thumbnailFromBody;

      items.push({
        id: `${thread.author}/${thread.permlink}`,
        author: thread.author,
        permlink: thread.permlink,
        title: '',
        excerpt,
        createdAt: createdAtFromChain,
        feedAt,
        rebloggedBy: null,
        isNsfw: false,
        category: thread.type,
        children: thread.children,
        pendingPayout: '',
        totalPayout: '',
        netRshares: '',
        thumbnailUrl,
        videoThumbnailUrl: extractVideoThumbnailUrl('', bodyText),
        videoEmbedUrl: extractVideoEmbedUrl('', bodyText, {
          author: thread.author,
          permlink: thread.permlink,
        }),
        authorProfile,
        objects: [],
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
        feedAt: Number(last.created_unix),
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
