'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { feedExcerptToSafeHtml } from '@/shared/infrastructure/feed-excerpt-html';
import {
  AVATAR_PLACEHOLDER_SRC,
  shouldUnoptimizeRemoteImage,
  UserAvatar,
} from '@/shared/presentation';

import { objectFields } from '../../application/dto/object-fields';
import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import type { FeedTab } from '../../domain/feed-tab';

import {
  FEED_STORY_TAGGED_OBJECT_MAX,
  formatPayoutDisplay,
  formatRelativeFeedTime,
  formatReputation,
} from './story-utils';
import { StoryCommentEditor } from './story-comment-editor';
import { StoryOverflowMenu } from './story-overflow-menu';
import { StoryVoteButton } from './story-vote-button';

type StoryProps = {
  story: FeedStoryView;
  feedTab?: FeedTab;
  currentUsername: string | null;
};

function IconComment({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconReblog({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconPlay() {
  return (
    <span
      className="inline-flex items-center justify-center rounded-circle bg-overlay/80 p-3 shadow-card"
      aria-hidden
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="ml-0.5 text-white drop-shadow-lg"
      >
        <path d="M8 5v14l11-7L8 5z" />
      </svg>
    </span>
  );
}

type StatButtonProps = {
  icon: ReactNode;
  count: number | undefined;
  label: string;
  title?: string | null;
  /** When `false`, icon uses muted tone (e.g. vote not cast). Omit or `true` for accent. */
  iconActive?: boolean;
  /** When `true`, vote count uses accent (e.g. viewer has voted). */
  countAccent?: boolean;
  /** Optional `aria-pressed` for vote state. */
  ariaPressed?: boolean;
};

function StatButton({
  icon,
  count,
  label,
  title,
  iconActive,
  countAccent,
  ariaPressed,
}: StatButtonProps) {
  const showCount = count != null;
  const iconToneClass = iconActive === false ? 'text-muted' : 'text-accent';
  const countClass =
    countAccent === true ? 'font-medium tabular-nums text-accent' : 'font-medium tabular-nums text-fg-secondary';
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-caption text-muted transition-colors hover:bg-surface-control hover:text-fg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      disabled
      aria-label={label}
      title={title ?? undefined}
      aria-pressed={ariaPressed}
    >
      <span className={iconToneClass}>{icon}</span>
      {showCount ? <span className={countClass}>{count}</span> : null}
    </button>
  );
}

function viewerIsAuthor(
  viewer: string | null,
  author: string,
): boolean {
  if (viewer == null || viewer === '') {
    return false;
  }
  return viewer.trim().toLowerCase() === author.trim().toLowerCase();
}

export function Story({ story, feedTab, currentUsername }: StoryProps) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [previewMediaFailed, setPreviewMediaFailed] = useState(false);
  const { locale } = useI18n();
  const displayAuthor = story.authorDisplayName ?? story.authorName;
  const displayTimeIso = story.feedAt ?? story.createdAt;
  const relativeLabel = formatRelativeFeedTime(displayTimeIso, locale);
  const repLabel = formatReputation(story.authorReputation, locale);
  const payoutLabel = formatPayoutDisplay(story.pendingPayout, story.totalPayout);
  const taggedObjects =
    story.objects && story.objects.length > 0
      ? story.objects.slice(0, FEED_STORY_TAGGED_OBJECT_MAX)
      : [];
  const previewMediaUrl = story.videoThumbnailUrl ?? story.thumbnailUrl;
  const canPlayInline = Boolean(story.videoEmbedUrl);

  useEffect(() => {
    setPreviewMediaFailed(false);
  }, [previewMediaUrl]);
  const isOwnPost = viewerIsAuthor(currentUsername, story.authorName);
  const editorSearch = new URLSearchParams({
    author: story.authorName,
    permlink: story.permlink,
  });
  const editHref = `/editor?${editorSearch.toString()}`;
  const authorProfileHref = `/@${encodeURIComponent(story.authorName)}`;

  return (
    <article
      className="rounded-card border border-border bg-surface/80 p-card-padding shadow-whisper"
      aria-labelledby={`story-title-${story.id}`}
      data-feed-tab={feedTab}
    >
      {story.rebloggedBy ? (
        <p className="mb-3 rounded-md bg-surface-control px-2 py-1 text-caption text-muted">
          Reblogged by{' '}
          <span className="font-medium text-fg-secondary">@{story.rebloggedBy}</span>
        </p>
      ) : null}

      <header className="flex gap-3">
        <Link
          href={authorProfileHref}
          className="inline-flex shrink-0 self-start rounded-circle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`View profile: @${story.authorName}`}
        >
          <UserAvatar
            username={story.authorName}
            avatarUrl={story.authorAvatarUrl}
            displayName={displayAuthor}
            size={40}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={authorProfileHref}
              className="font-weight-label text-body-sm text-fg hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {displayAuthor}
            </Link>
            {repLabel != null ? (
              <span className="rounded bg-surface-control px-1.5 py-0.5 text-caption font-medium text-fg-secondary tabular-nums">
                {repLabel}
              </span>
            ) : null}
            <span className="text-caption text-muted">·</span>
            <time className="text-caption text-fg-tertiary" dateTime={displayTimeIso}>
              {relativeLabel}
            </time>
            {story.category ? (
              <>
                <span className="text-caption text-muted">·</span>
                <span className="text-caption text-fg-tertiary">{story.category}</span>
              </>
            ) : null}
          </div>
        </div>
        {taggedObjects.length > 0 ? (
          <ul
            className="flex max-w-[10rem] shrink-0 flex-wrap content-start justify-end gap-1.5 sm:max-w-none"
            aria-label="Tagged objects"
          >
            {taggedObjects.map((o) => {
              const chipImage = objectFields.image(o);
              const chipName = objectFields.name(o);
              return (
                <li key={o.object_id} className="list-none" title={chipName ?? o.object_id}>
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-control ring-1 ring-border/60">
                    {chipImage ? (
                      <Image
                        src={chipImage}
                        alt=""
                        className="size-full object-cover"
                        width={36}
                        height={36}
                        sizes="36px"
                        unoptimized={shouldUnoptimizeRemoteImage(chipImage)}
                      />
                    ) : (
                      <Image
                        src={AVATAR_PLACEHOLDER_SRC}
                        alt=""
                        className="size-full object-cover"
                        width={36}
                        height={36}
                        sizes="36px"
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </header>

      <div className="relative mt-3 min-w-0">
        {story.permalinkPath != null && !videoPlaying ? (
          <Link
            href={story.permalinkPath}
            suppressHydrationWarning
            className="absolute inset-0 z-[5] cursor-pointer rounded-md"
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
            story.permalinkPath != null && !videoPlaying ? 'pointer-events-none' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {story.title ? (
            feedTab === 'comments' ? (
              <h2
                id={`story-title-${story.id}`}
                className="flex min-w-0 items-center gap-2 leading-snug"
              >
                <span
                  className="inline-flex shrink-0 items-center justify-center rounded-md bg-code-bg px-1.5 py-0.5 font-mono text-[0.65rem] font-bold uppercase leading-none tracking-wide text-code-fg"
                  aria-hidden
                >
                  RE
                </span>
                <span className="min-w-0 flex-1 text-body font-medium text-fg-secondary">
                  {story.title}
                </span>
              </h2>
            ) : (
              <h2
                id={`story-title-${story.id}`}
                className={[
                  'text-body-lg font-semibold',
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

          {previewMediaUrl ? (
            <div className="relative aspect-video max-h-[260px] min-h-[180px] w-full overflow-hidden rounded-md border border-border bg-surface-control">
              {videoPlaying && story.videoEmbedUrl ? (
                <>
                  <iframe
                    title={story.title ? `${story.title} — video` : 'Embedded video'}
                    src={story.videoEmbedUrl}
                    className="h-full w-full min-h-[180px] border-0 bg-black"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 z-30 rounded-md bg-overlay/90 px-2 py-1 text-caption font-medium text-fg shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    onClick={() => setVideoPlaying(false)}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  {previewMediaFailed ? (
                    <div
                      className="flex h-full min-h-[180px] w-full items-center justify-center bg-surface-control text-caption text-muted"
                      role="status"
                    >
                      Preview unavailable
                    </div>
                  ) : (
                    <Image
                      src={previewMediaUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      unoptimized={shouldUnoptimizeRemoteImage(previewMediaUrl)}
                      onError={() => setPreviewMediaFailed(true)}
                    />
                  )}
                  {canPlayInline ? (
                    <button
                      type="button"
                      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setVideoPlaying(true);
                      }}
                      aria-label="Play video"
                    >
                      <IconPlay />
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <div
            className="feed-story-excerpt pointer-events-none min-h-[1.5em] text-body text-fg-secondary line-clamp-6 [&_a]:pointer-events-auto [&_a]:break-words [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_p]:m-0 [&_p+p]:mt-2"
            dangerouslySetInnerHTML={{ __html: feedExcerptToSafeHtml(story.excerpt) }}
          />
          {story.isNsfw ? (
            <p className="text-caption text-muted" role="status">
              NSFW
            </p>
          ) : null}
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <StoryVoteButton
            authorName={story.authorName}
            permlink={story.permlink}
            votes={story.votes}
            currentUsername={currentUsername}
          />
          <StatButton
            icon={<IconComment />}
            count={story.children ?? 0}
            label="Comments"
          />
          {feedTab !== 'threads' && feedTab !== 'comments' ? (
            <StatButton icon={<IconReblog />} count={undefined} label="Reblog" />
          ) : null}
          <StoryOverflowMenu
            authorName={story.authorName}
            editHref={editHref}
            currentUsername={currentUsername}
            isOwnPost={isOwnPost}
          />
        </div>
        {payoutLabel ? (
          <span className="text-body-sm font-semibold tabular-nums text-accent">{payoutLabel}</span>
        ) : null}
      </footer>
      {currentUsername ? (
        <StoryCommentEditor story={story} currentUsername={currentUsername} />
      ) : null}
    </article>
  );
}
