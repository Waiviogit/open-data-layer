import type { ProjectedObject } from '../object-projection';

export interface FeedVoteSummaryDto {
  totalCount: number;
  previewVoters: string[];
  /** True when the viewer (see `X-Viewer`) has an active vote on this post. */
  voted: boolean;
}

export interface FeedStoryItemDto {
  id: string;
  author: string;
  permlink: string;
  title: string;
  excerpt: string;
  createdAt: string;
  feedAt: string;
  rebloggedBy: string | null;
  isNsfw: boolean;
  category: string | null;
  children: number;
  pendingPayout: string;
  totalPayout: string;
  netRshares: string;
  thumbnailUrl: string | null;
  /** Poster URL when post embeds video (json_metadata.video or video links in body). */
  videoThumbnailUrl: string | null;
  /** Iframe `src` for inline playback when detectable (HTTPS embed URLs). */
  videoEmbedUrl: string | null;
  authorProfile: {
    name: string;
    displayName: string | null;
    avatarUrl: string | null;
    reputation: number;
  };
  objects: ProjectedObject[];
  votes: FeedVoteSummaryDto;
}

export interface UserBlogFeedResponse {
  items: FeedStoryItemDto[];
  cursor: string | null;
  hasMore: boolean;
}

/** Single post by author/permlink; includes full body and all tagged objects (same resolution as feed). */
export interface SinglePostViewDto extends FeedStoryItemDto {
  body: string;
}
