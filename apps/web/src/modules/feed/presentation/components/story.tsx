'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { AVATAR_PLACEHOLDER_SRC, UserAvatar } from '@/shared/presentation';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import type { FeedTab } from '../../domain/feed-tab';

import {
  FEED_STORY_TAGGED_OBJECT_MAX,
  formatPayoutDisplay,
  formatRelativeFeedTime,
  formatReputation,
  formatVoteSummary,
} from './story-utils';
import { StoryOverflowMenu } from './story-overflow-menu';

type StoryProps = {
  story: FeedStoryView;
  feedTab?: FeedTab;
  currentUsername: string | null;
};

function IconThumbUp({ className }: { className?: string }) {
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
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

/** Solid fill — use with `text-accent` when the viewer has voted (matches active like control). */
function IconThumbUpFilled({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

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
  const { locale } = useI18n();
  const displayAuthor = story.authorDisplayName ?? story.authorName;
  const displayTimeIso = story.feedAt ?? story.createdAt;
  const relativeLabel = formatRelativeFeedTime(displayTimeIso, locale);
  const repLabel = formatReputation(story.authorReputation, locale);
  const voteLine =
    story.votes != null
      ? formatVoteSummary(story.votes.totalCount, story.votes.previewVoters)
      : null;
  const payoutLabel = formatPayoutDisplay(story.pendingPayout, story.totalPayout);
  const taggedObjects =
    story.objects && story.objects.length > 0
      ? story.objects.slice(0, FEED_STORY_TAGGED_OBJECT_MAX)
      : [];
  const previewMediaUrl = story.videoThumbnailUrl ?? story.thumbnailUrl;
  const canPlayInline = Boolean(story.videoEmbedUrl);
  const isOwnPost = viewerIsAuthor(currentUsername, story.authorName);
  const editorSearch = new URLSearchParams({
    author: story.authorName,
    permlink: story.permlink,
  });
  const editHref = `/editor?${editorSearch.toString()}`;

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
        <UserAvatar
          username={story.authorName}
          avatarUrl={story.authorAvatarUrl}
          displayName={displayAuthor}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-weight-label text-body-sm text-fg">{displayAuthor}</span>
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
            {taggedObjects.map((o) => (
              <li key={o.objectId} className="list-none" title={o.name ?? o.objectId}>
                <span className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-control ring-1 ring-border/60">
                  {o.avatarUrl ? (
                    <Image
                      src={o.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                      width={36}
                      height={36}
                      sizes="36px"
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
            ))}
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
                  <Image
                    src={previewMediaUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
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

          <p className="min-h-[1.5em] whitespace-pre-wrap text-body text-fg-secondary line-clamp-6">
            {story.excerpt}
          </p>
          {story.isNsfw ? (
            <p className="text-caption text-muted" role="status">
              NSFW
            </p>
          ) : null}
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <StatButton
            icon={story.votes?.voted ? <IconThumbUpFilled /> : <IconThumbUp />}
            count={story.votes?.totalCount ?? 0}
            label="Likes"
            title={voteLine ?? undefined}
            iconActive={story.votes?.voted === true}
            countAccent={story.votes?.voted === true}
            ariaPressed={story.votes != null ? story.votes.voted : undefined}
          />
          <StatButton
            icon={<IconComment />}
            count={story.children ?? 0}
            label="Comments"
          />
          <StatButton icon={<IconReblog />} count={undefined} label="Reblog" />
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
    </article>
  );
}
