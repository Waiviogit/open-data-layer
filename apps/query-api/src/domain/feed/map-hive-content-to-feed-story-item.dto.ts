import type { HiveContentType } from '@opden-data-layer/clients';

import type { FeedStoryItemDto } from './feed-story-dtos';
import {
  buildVoteSummaryFromHiveActiveVotes,
  normalizeHiveContentJsonMetadata,
} from './map-hive-content-to-single-post.dto';
import { stripHtmlForExcerpt, truncateExcerpt } from './post-excerpt';
import { extractThumbnailUrl } from './post-thumbnail';
import { extractVideoEmbedUrl, extractVideoThumbnailUrl } from './post-video-thumbnail';
import { isNsfwPost } from './post-nsfw';

function rebloggedByFromHive(content: HiveContentType): string | null {
  const users = content.reblogged_users;
  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }
  const first = users[0];
  return typeof first === 'string' && first.trim() !== '' ? first.trim() : null;
}

/** Maps `HiveContentType` (e.g. from `get_discussions_by_comments`) to a feed card row. */
export function mapHiveContentToFeedStoryItemDto(
  content: HiveContentType,
  authorProfile: FeedStoryItemDto['authorProfile'],
  viewerAccount: string | undefined,
): FeedStoryItemDto {
  const jsonMetadata = normalizeHiveContentJsonMetadata(content.json_metadata);
  const body = content.body ?? '';
  const excerpt = truncateExcerpt(stripHtmlForExcerpt(body));
  const author = content.author;
  const permlink = content.permlink;
  const createdRaw = content.created?.trim() ?? '';
  const createdAt =
    createdRaw !== ''
      ? new Date(createdRaw).toISOString()
      : new Date(0).toISOString();

  return {
    id: `${author}/${permlink}`,
    author,
    permlink,
    title: content.title ?? '',
    excerpt,
    createdAt,
    feedAt: createdAt,
    rebloggedBy: rebloggedByFromHive(content),
    isNsfw: isNsfwPost(jsonMetadata, content.category ?? null),
    category: content.category ?? null,
    children: typeof content.children === 'number' ? content.children : Number(content.children) || 0,
    pendingPayout: content.pending_payout_value ?? '',
    totalPayout: content.total_payout_value ?? '',
    netRshares: String(content.net_rshares ?? 0),
    thumbnailUrl: extractThumbnailUrl(jsonMetadata, body),
    videoThumbnailUrl: extractVideoThumbnailUrl(jsonMetadata, body),
    videoEmbedUrl: extractVideoEmbedUrl(jsonMetadata, body, { author, permlink }),
    authorProfile,
    objects: [],
    votes: buildVoteSummaryFromHiveActiveVotes(content.active_votes, viewerAccount),
  };
}
