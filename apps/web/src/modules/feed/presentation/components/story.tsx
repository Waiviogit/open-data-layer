'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CommentIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { feedExcerptToSafeHtml } from '@/shared/infrastructure/feed-excerpt-html';
import { isThreeSpeakEmbedUrl } from '@/shared/infrastructure/three-speak-preview';
import { isNativeFeedVideoUrl } from '@/shared/infrastructure/video-preview';
import {
  getImagePathPost,
  ObjectThumbnail,
  StatHoverTooltip,
  UserAvatar,
  VideoPreviewPlayer,
} from '@/shared/presentation';
import { objectPagePath } from '@/shared/routes/object-page-path';

import { objectFields } from '../../application/dto/object-fields';
import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import type { FeedTab } from '../../domain/feed-tab';

import { useStoryPreviewMediaUrl } from '../hooks/use-story-preview-media-url';
import {
  FEED_STORY_TAGGED_OBJECT_MAX,
  formatRelativeFeedTime,
  formatReputation,
} from './story-utils';
import { StoryRewardBadge } from './story-reward-badge';
import { ObjectPageLink } from './object-page-link';
import { StoryCommentEditor } from './story-comment-editor';
import { StoryCommentsSection } from './story-comments-section';
import { StoryOverflowMenu } from './story-overflow-menu';
import { StoryReblogButton } from './story-reblog-button';
import { StoryStatButton } from './story-stat-button';
import { StoryVoteButton } from './story-vote-button';

type StoryProps = {
  story: FeedStoryView;
  feedTab?: FeedTab;
  currentUsername: string | null;
  onBroadcastRevalidate?: () => Promise<void>;
};

function viewerIsAuthor(
  viewer: string | null,
  author: string,
): boolean {
  if (viewer == null || viewer === '') {
    return false;
  }
  return viewer.trim().toLowerCase() === author.trim().toLowerCase();
}

export function Story({
  story,
  feedTab,
  currentUsername,
  onBroadcastRevalidate,
}: StoryProps) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const { t, locale } = useI18n();
  const displayAuthor = story.authorDisplayName ?? story.authorName;
  const displayTimeIso = story.feedAt ?? story.createdAt;
  const relativeLabel = formatRelativeFeedTime(displayTimeIso, locale);
  const repLabel = formatReputation(story.authorWobjectsWeight, locale);
  const taggedObjects =
    story.objects && story.objects.length > 0
      ? story.objects.slice(0, FEED_STORY_TAGGED_OBJECT_MAX)
      : [];
  const isThreeSpeakVideo = isThreeSpeakEmbedUrl(story.videoEmbedUrl);
  const previewMediaUrl = useStoryPreviewMediaUrl(
    story.videoEmbedUrl,
    story.videoThumbnailUrl,
    story.thumbnailUrl,
  );
  /** Display URL (Hive `0x0` proxy); omit matching still uses raw `previewMediaUrl`. */
  const previewMediaDisplayUrl = previewMediaUrl
    ? getImagePathPost(previewMediaUrl)
    : null;
  const showPreviewBlock = Boolean(previewMediaUrl || story.videoEmbedUrl);
  const isNativeFeedVideo = isNativeFeedVideoUrl(story.videoEmbedUrl);
  const isPostVideoActive = videoPlaying || isNativeFeedVideo;

  const isOwnPost = viewerIsAuthor(currentUsername, story.authorName);
  const editorSearch = new URLSearchParams({
    author: story.authorName,
    permlink: story.permlink,
  });
  const editHref = `/editor?${editorSearch.toString()}`;
  const authorProfileHref = `/@${encodeURIComponent(story.authorName)}`;

  return (
    <article
      className="min-w-0 rounded-card border border-border bg-surface/80 p-3 shadow-whisper sm:p-card-padding"
      aria-labelledby={`story-title-${story.id}`}
      data-feed-tab={feedTab}
    >
      {story.rebloggedBy ? (
        <p className="mb-3 rounded-btn bg-surface-control px-2 py-1 text-caption text-muted">
          Reblogged by{' '}
          <span className="font-weight-label text-fg-secondary">@{story.rebloggedBy}</span>
        </p>
      ) : null}

      <header className="flex min-w-0 items-start gap-2 sm:gap-3">
        <Link
          href={authorProfileHref}
          suppressHydrationWarning
          className="inline-flex shrink-0 self-start rounded-circle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`View profile: @${story.authorName}`}
        >
          <UserAvatar
            username={story.authorName}
            avatarUrl={story.authorAvatarUrl}
            displayName={displayAuthor}
            size={40}
            className="max-sm:!h-9 max-sm:!w-9 max-sm:!min-h-9 max-sm:!min-w-9"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              href={authorProfileHref}
              suppressHydrationWarning
              className="truncate font-weight-label text-body-sm text-fg hover:underline focus-visible:rounded-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {displayAuthor}
            </Link>
            {repLabel != null ? (
              <StatHoverTooltip content={t('stat_user_expertise_tooltip')}>
                <span className="shrink-0 rounded border border-border bg-surface-control px-1.5 py-0.5 text-caption font-weight-label text-fg-secondary tabular-nums">
                  {repLabel}
                </span>
              </StatHoverTooltip>
            ) : null}
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-fg-tertiary">
            <time dateTime={displayTimeIso}>{relativeLabel}</time>
            {story.category ? (
              <>
                <span className="hidden text-muted sm:inline" aria-hidden>
                  ·
                </span>
                <span className="hidden truncate sm:inline">{story.category}</span>
              </>
            ) : null}
          </div>
        </div>
        {taggedObjects.length > 0 ? (
          <ul
            className="flex max-w-[9.5rem] shrink-0 flex-nowrap items-start justify-end gap-1 overflow-x-auto scrollbar-hide sm:max-w-none sm:flex-wrap sm:gap-1.5"
            aria-label="Tagged objects"
          >
            {taggedObjects.map((o) => {
              const chipImage = objectFields.image(o);
              const chipName = objectFields.name(o);
              const chipLabel = chipName ?? o.object_id;
              return (
                <li key={o.object_id} className="list-none shrink-0">
                  <ObjectPageLink
                    href={objectPagePath(o.object_id)}
                    title={chipLabel}
                    ariaLabel={`View object: ${chipLabel}`}
                    className="inline-flex rounded-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <span className="flex size-8 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-control sm:size-10">
                      <ObjectThumbnail
                        src={chipImage}
                        size={40}
                        avatarSize="small"
                        className="size-full object-cover"
                        sizes="40px"
                      />
                    </span>
                  </ObjectPageLink>
                </li>
              );
            })}
          </ul>
        ) : null}
      </header>

      <div className="relative mt-3 min-w-0 overflow-x-clip">
        {story.permalinkPath != null && !isPostVideoActive ? (
          <Link
            href={story.permalinkPath}
            suppressHydrationWarning
            className="absolute inset-0 z-[5] cursor-pointer rounded-btn"
            aria-label={
              story.title?.trim()
                ? `View post: ${story.title.trim()}`
                : `View post by @${story.authorName}`
            }
          >
            <span className="sr-only">
              {story.title?.trim() ? story.title.trim() : `Post by @${story.authorName}`}
            </span>
          </Link>
        ) : null}

        <div
          className={[
            'relative z-10 space-y-3',
            story.permalinkPath != null && !isPostVideoActive ? 'pointer-events-none' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {story.title ? (
            feedTab === 'comments' ? (
              <h2
                id={`story-title-${story.id}`}
                className="flex min-w-0 items-center gap-2 leading-body"
              >
                <span
                  className="inline-flex shrink-0 items-center justify-center rounded-btn bg-code-bg px-1.5 py-0.5 font-mono text-nano font-weight-strong uppercase leading-none tracking-loose text-code-fg"
                  aria-hidden
                >
                  RE
                </span>
                <span className="min-w-0 flex-1 text-body font-weight-label text-fg-secondary">
                  {story.title}
                </span>
              </h2>
            ) : story.permalinkPath && isPostVideoActive ? (
              <h2
                id={`story-title-${story.id}`}
                className="text-body-lg font-weight-strong leading-snug"
              >
                <Link
                  href={story.permalinkPath}
                  suppressHydrationWarning
                  className="feed-story-title-link relative z-20 block line-clamp-2 pointer-events-auto"
                >
                  {story.title}
                </Link>
              </h2>
            ) : (
              <h2
                id={`story-title-${story.id}`}
                className={[
                  'line-clamp-2 text-body-lg font-weight-strong leading-snug',
                  story.permalinkPath ? 'feed-story-title-link' : 'text-heading',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {story.title}
              </h2>
            )
          ) : (
            <h2 id={`story-title-${story.id}`} className="sr-only">
              Post by {displayAuthor}
            </h2>
          )}

          {showPreviewBlock ? (
            story.videoEmbedUrl ? (
              <VideoPreviewPlayer
                source={story.videoEmbedUrl}
                staticThumbnailUrl={story.videoThumbnailUrl}
                title={story.title ?? undefined}
                variant="feed"
                playing={videoPlaying}
                onPlayingChange={setVideoPlaying}
              />
            ) : previewMediaDisplayUrl ? (
              <div className="rounded-btn border border-border bg-surface-control">
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewMediaDisplayUrl}
                    alt=""
                    className="block h-auto w-full"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            ) : null
          ) : null}

          <div
            suppressHydrationWarning
            className="feed-story-excerpt pointer-events-none min-h-[1.5em] text-body text-fg line-clamp-6 [&_a]:pointer-events-auto [&_a]:break-words [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_img]:pointer-events-auto [&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_p]:m-0 [&_p]:text-fg [&_p+p]:mt-2"
            dangerouslySetInnerHTML={{
              __html: feedExcerptToSafeHtml(story.excerpt, isThreeSpeakVideo
                ? {
                    omitImageUrls: [
                      previewMediaUrl,
                      story.thumbnailUrl,
                      story.videoThumbnailUrl,
                    ],
                    stripThreeSpeakLinks: true,
                    stripVideoLinks: true,
                  }
                : {
                    omitImageUrl: previewMediaUrl,
                    stripVideoLinks: Boolean(story.videoEmbedUrl),
                  }),
            }}
          />
          {story.isNsfw ? (
            <p className="text-caption text-muted" role="status">
              NSFW
            </p>
          ) : null}
        </div>
      </div>

      <footer className="relative z-20 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <StoryVoteButton
            authorName={story.authorName}
            permlink={story.permlink}
            votes={story.votes}
            currentUsername={currentUsername}
            contentType={feedTab === 'threads' ? 'thread' : 'post'}
            onBroadcastRevalidate={onBroadcastRevalidate}
          />
          <StoryStatButton
            icon={<CommentIcon size={20} />}
            count={
              (story.children ?? 0) > 0 ? story.children : undefined
            }
            label="Comments"
            iconHoverAccent
            ariaPressed={commentsExpanded}
            onClick={() => setCommentsExpanded((v) => !v)}
          />
          {feedTab !== 'threads' && feedTab !== 'comments' ? (
            <StoryReblogButton
              authorName={story.authorName}
              permlink={story.permlink}
              rebloggedByViewer={story.rebloggedByViewer ?? false}
              currentUsername={currentUsername}
              isOwnPost={isOwnPost}
              onBroadcastRevalidate={onBroadcastRevalidate}
            />
          ) : null}
          <StoryOverflowMenu
            authorName={story.authorName}
            editHref={editHref}
            currentUsername={currentUsername}
            isOwnPost={isOwnPost}
          />
        </div>
        <StoryRewardBadge
          reward={story.reward}
          waivRewardEligible={story.waivRewardEligible ?? false}
          postAuthor={story.authorName}
        />
      </footer>
      {commentsExpanded ? (
        <>
          <StoryCommentsSection
            story={story}
            currentUsername={currentUsername}
            expanded
          />
          {currentUsername ? (
            <StoryCommentEditor
              story={story}
              currentUsername={currentUsername}
              onBroadcastRevalidate={onBroadcastRevalidate}
            />
          ) : null}
        </>
      ) : null}
    </article>
  );
}
