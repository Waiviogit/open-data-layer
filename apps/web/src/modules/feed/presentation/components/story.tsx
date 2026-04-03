'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { AVATAR_PLACEHOLDER_SRC, UserAvatar } from '@/shared/presentation';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import type { FeedTab } from '../../domain/feed-tab';

import {
  FEED_STORY_TAGGED_OBJECT_MAX,
  formatPayoutDisplay,
  formatRelativeFeedTime,
} from './story-utils';

type StoryProps = {
  story: FeedStoryView;
  feedTab?: FeedTab;
};

function formatVoteSummary(totalCount: number, previewVoters: string[]): string | null {
  if (totalCount <= 0) {
    return null;
  }
  const a = previewVoters[0];
  const b = previewVoters[1];
  if (totalCount === 1) {
    return a ? `@${a} liked this` : `${totalCount} like`;
  }
  if (totalCount === 2) {
    if (a && b) {
      return `@${a} and @${b} liked this`;
    }
    return `${totalCount} like this`;
  }
  if (a && b) {
    return `@${a}, @${b} and ${totalCount - 2} more liked this`;
  }
  return `${totalCount} like this`;
}

function formatReputation(n: number | undefined): string | null {
  if (n == null || Number.isNaN(n)) {
    return null;
  }
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

function IconMore({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
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

export function Story({ story, feedTab }: StoryProps) {
  const { locale } = useI18n();
  const displayAuthor = story.authorDisplayName ?? story.authorName;
  const displayTimeIso = story.feedAt ?? story.createdAt;
  const relativeLabel = formatRelativeFeedTime(displayTimeIso, locale);
  const repLabel = formatReputation(story.authorReputation);
  const voteLine =
    story.votes != null
      ? formatVoteSummary(story.votes.totalCount, story.votes.previewVoters)
      : null;
  const payoutLabel = formatPayoutDisplay(story.pendingPayout, story.totalPayout);
  const taggedObjects =
    story.objects && story.objects.length > 0
      ? story.objects.slice(0, FEED_STORY_TAGGED_OBJECT_MAX)
      : [];

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
                    <img
                      src={o.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                      width={36}
                      height={36}
                    />
                  ) : (
                    <img
                      src={AVATAR_PLACEHOLDER_SRC}
                      alt=""
                      className="size-full object-cover"
                      width={36}
                      height={36}
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="mt-3 min-w-0">
        {story.title ? (
          story.permalinkPath ? (
            <h2 id={`story-title-${story.id}`} className="text-body-lg font-semibold text-heading">
              <Link
                href={story.permalinkPath}
                className="text-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {story.title}
              </Link>
            </h2>
          ) : (
            <h2 id={`story-title-${story.id}`} className="text-body-lg font-semibold text-heading">
              {story.title}
            </h2>
          )
        ) : (
          <h2 id={`story-title-${story.id}`} className="sr-only">
            Post by {displayAuthor}
          </h2>
        )}

        {story.thumbnailUrl ? (
          <div className="mt-3 overflow-hidden rounded-md border border-border bg-surface-control">
            <img
              src={story.thumbnailUrl}
              alt=""
              className="max-h-[260px] w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <p className="mt-3 min-h-[1.5em] whitespace-pre-wrap text-body text-fg-secondary line-clamp-6">
          {story.excerpt}
        </p>
        {story.isNsfw ? (
          <p className="mt-2 text-caption text-muted" role="status">
            NSFW
          </p>
        ) : null}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
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
          <button
            type="button"
            className="inline-flex items-center rounded-md px-1 py-1 text-caption text-muted transition-colors hover:bg-surface-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            disabled
            aria-label="More"
          >
            <IconMore />
          </button>
        </div>
        {payoutLabel ? (
          <span className="text-body-sm font-semibold tabular-nums text-accent">{payoutLabel}</span>
        ) : null}
      </footer>
    </article>
  );
}
