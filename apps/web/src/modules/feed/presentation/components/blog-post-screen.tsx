'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { AVATAR_PLACEHOLDER_SRC, UserAvatar } from '@/shared/presentation';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';

import {
  formatPayoutDisplay,
  formatRelativeFeedTime,
  formatReputation,
  formatVoteSummary,
} from './story-utils';
import { StoryOverflowMenu } from './story-overflow-menu';

export type BlogPostScreenVariant = 'page' | 'modal';

type BlogPostScreenProps = {
  variant?: BlogPostScreenVariant;
  story: FeedStoryView;
  bodyHtmlSafe: string;
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
};

function StatButton({ icon, count, label, title }: StatButtonProps) {
  const showCount = count != null;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-caption text-muted transition-colors hover:bg-surface-control hover:text-fg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      disabled
      aria-label={label}
      title={title ?? undefined}
    >
      <span className="text-accent">{icon}</span>
      {showCount ? <span className="font-medium text-fg-secondary">{count}</span> : null}
    </button>
  );
}

function viewerIsAuthor(viewer: string | null, author: string): boolean {
  if (viewer == null || viewer === '') {
    return false;
  }
  return viewer.trim().toLowerCase() === author.trim().toLowerCase();
}

function TaggedObjectsSection({ objects }: { objects: NonNullable<FeedStoryView['objects']> }) {
  const { t } = useI18n();
  if (objects.length === 0) {
    return null;
  }
  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="post-tagged-objects-heading">
      <h2
        id="post-tagged-objects-heading"
        className="font-label text-section text-heading tracking-body"
      >
        {t('feed_post_tagged_objects')}
      </h2>
      <ul
        className="mt-3 flex flex-wrap gap-3"
        aria-label={t('feed_post_tagged_objects')}
      >
        {objects.map((o) => (
          <li key={o.objectId} className="list-none" title={o.name ?? o.objectId}>
            <span className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-control ring-1 ring-border/60">
              {o.avatarUrl ? (
                <Image
                  src={o.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                  width={44}
                  height={44}
                  sizes="44px"
                />
              ) : (
                <Image
                  src={AVATAR_PLACEHOLDER_SRC}
                  alt=""
                  className="size-full object-cover"
                  width={44}
                  height={44}
                  sizes="44px"
                />
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BlogPostScreen({
  variant = 'page',
  story,
  bodyHtmlSafe,
  currentUsername,
}: BlogPostScreenProps) {
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
  const taggedObjects = story.objects ?? [];
  const previewMediaUrl = story.videoThumbnailUrl ?? story.thumbnailUrl;
  const canPlayInline = Boolean(story.videoEmbedUrl);
  const isOwnPost = viewerIsAuthor(currentUsername, story.authorName);
  const editorSearch = new URLSearchParams({
    author: story.authorName,
    permlink: story.permlink,
  });
  const editHref = `/editor?${editorSearch.toString()}`;

  const isModal = variant === 'modal';

  const shellClass = isModal
    ? 'border-0 bg-transparent p-0 shadow-none'
    : 'rounded-card border border-border bg-surface/80 p-card-padding shadow-whisper';

  return (
    <article
      className={shellClass}
      aria-labelledby={`post-title-${story.id}`}
      data-blog-post-variant={variant}
    >
      {story.rebloggedBy ? (
        <p className="mb-3 rounded-md bg-surface-control px-2 py-1 text-caption text-muted">
          Reblogged by{' '}
          <span className="font-medium text-fg-secondary">@{story.rebloggedBy}</span>
        </p>
      ) : null}

      <div className="min-w-0">
        {/* Title */}
        {story.title ? (
          <h1
            id={`post-title-${story.id}`}
            className={isModal ? 'text-[1.6rem] font-semibold leading-tight text-heading' : 'text-display font-display text-heading'}
          >
            {story.title}
          </h1>
        ) : (
          <h1 id={`post-title-${story.id}`} className="sr-only">
            Post by {displayAuthor}
          </h1>
        )}

        {/* Comment count — accent link, shown below title in modal */}
        {isModal && story.children != null && story.children > 0 ? (
          <p className="mt-1.5 text-body-sm font-medium text-accent">
            {story.children} {story.children === 1 ? 'comment' : 'comments'}
          </p>
        ) : null}

        {/* Author row */}
        <header className="mt-4 flex gap-3">
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
          {!isModal ? (
            <StoryOverflowMenu
              authorName={story.authorName}
              editHref={editHref}
              currentUsername={currentUsername}
              isOwnPost={isOwnPost}
            />
          ) : null}
        </header>

        {/* Video / thumbnail */}
        {previewMediaUrl ? (
          <div className={`relative w-full overflow-hidden rounded-md border border-border bg-surface-control ${isModal ? 'mt-5 aspect-video' : 'mt-4 aspect-video max-h-[260px] min-h-[180px]'}`}>
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
                  className="absolute right-2 top-2 rounded-md bg-overlay/90 px-2 py-1 text-caption font-medium text-fg shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
                  sizes="(max-width: 640px) 100vw, 700px"
                  className="object-cover"
                />
                {canPlayInline ? (
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    onClick={() => setVideoPlaying(true)}
                    aria-label="Play video"
                  >
                    <IconPlay />
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {/* Body */}
        <div
          className={[
            'blog-post-body min-w-0 text-fg leading-body',
            isModal ? 'mt-5 text-[0.9375rem]' : 'mt-6 text-body',
            '[&_a]:break-words [&_a]:text-link',
            '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-fg-secondary',
            '[&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold',
            '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold',
            '[&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:font-semibold',
            '[&_img]:h-auto [&_img]:max-w-full [&_img]:my-3',
            '[&_p]:mb-4 [&_p]:empty:hidden',
            '[&_br]:block [&_br]:content-[""] [&_br]:mt-3',
            '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-code-bg [&_pre]:p-3',
            '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5',
            '[&_li]:mb-1',
          ].join(' ')}
          dangerouslySetInnerHTML={{ __html: bodyHtmlSafe }}
        />

        <TaggedObjectsSection objects={taggedObjects} />

        {story.isNsfw ? (
          <p className="mt-2 text-caption text-muted" role="status">
            NSFW
          </p>
        ) : null}
      </div>

      <footer className={`flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 ${isModal ? 'mt-6' : 'mt-4'}`}>
        <div className="flex flex-wrap items-center gap-1">
          <StatButton
            icon={<IconThumbUp />}
            count={story.votes?.totalCount ?? 0}
            label="Likes"
            title={voteLine ?? undefined}
          />
          <StatButton
            icon={<IconComment />}
            count={story.children ?? 0}
            label="Comments"
          />
          <StatButton icon={<IconReblog />} count={undefined} label="Reblog" />
          {isModal ? (
            <StoryOverflowMenu
              authorName={story.authorName}
              editHref={editHref}
              currentUsername={currentUsername}
              isOwnPost={isOwnPost}
            />
          ) : null}
        </div>
        {payoutLabel ? (
          <span className="text-body-sm font-semibold tabular-nums text-accent">{payoutLabel}</span>
        ) : null}
      </footer>
    </article>
  );
}
