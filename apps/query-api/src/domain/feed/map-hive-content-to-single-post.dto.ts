import type { ActiveVotesType, HiveContentType } from '@opden-data-layer/clients';

import type { FeedVoteSummaryDto, SinglePostViewDto } from './feed-story-dtos';
import { FEED_PREVIEW_VOTER_DISPLAY } from './feed.constants';
import { stripHtmlForExcerpt, truncateExcerpt } from './post-excerpt';
import { extractThumbnailUrl } from './post-thumbnail';
import { extractVideoEmbedUrl, extractVideoThumbnailUrl } from './post-video-thumbnail';
import { isNsfwPost } from './post-nsfw';

export type SinglePostAuthorProfileSlice = SinglePostViewDto['authorProfile'];

function normalizeJsonMetadata(raw: HiveContentType['json_metadata']): string {
  if (raw == null) {
    return '';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return '';
  }
}

function buildVoteSummaryFromHiveActiveVotes(
  activeVotes: ActiveVotesType[] | undefined,
  viewerAccount: string | undefined,
): FeedVoteSummaryDto {
  const votes = activeVotes ?? [];
  const sorted = [...votes].sort((a, b) => (b.rshares ?? 0) - (a.rshares ?? 0));
  const viewer = viewerAccount?.trim().toLowerCase();
  const voted =
    viewer !== undefined && viewer !== ''
      ? votes.some((v) => v.voter.trim().toLowerCase() === viewer)
      : false;
  return {
    totalCount: votes.length,
    previewVoters: sorted.slice(0, FEED_PREVIEW_VOTER_DISPLAY).map((v) => v.voter),
    voted,
  };
}

function rebloggedByFromHive(content: HiveContentType): string | null {
  const users = content.reblogged_users;
  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }
  const first = users[0];
  return typeof first === 'string' && first.trim() !== '' ? first.trim() : null;
}

/**
 * Builds {@link SinglePostViewDto} from `condenser_api.get_content` when the post is not in ODL DB.
 */
export function mapHiveContentToSinglePostView(
  content: HiveContentType,
  authorProfile: SinglePostAuthorProfileSlice,
  viewerAccount: string | undefined,
): SinglePostViewDto {
  const jsonMetadata = normalizeJsonMetadata(content.json_metadata);
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
    body,
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
