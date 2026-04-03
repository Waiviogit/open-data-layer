'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import type { LocaleId } from '@/i18n/types';
import { UserAvatar } from '@/shared/presentation';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import type { FeedTab } from '../../domain/feed-tab';

type StoryProps = {
  story: FeedStoryView;
  feedTab?: FeedTab;
};

function formatCreatedAt(iso: string, locale: LocaleId): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

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

export function Story({ story, feedTab }: StoryProps) {
  const { locale } = useI18n();
  const displayAuthor = story.authorDisplayName ?? story.authorName;
  const displayTimeIso = story.feedAt ?? story.createdAt;
  const dateLabel = formatCreatedAt(displayTimeIso, locale);
  const voteLine =
    story.votes != null
      ? formatVoteSummary(story.votes.totalCount, story.votes.previewVoters)
      : null;

  return (
    <article
      className="rounded-card border border-border bg-surface/80 p-card-padding shadow-whisper"
      aria-labelledby={`story-title-${story.id}`}
      data-feed-tab={feedTab}
    >
      <header className="flex gap-3">
        <UserAvatar
          username={story.authorName}
          avatarUrl={story.authorAvatarUrl}
          displayName={displayAuthor}
          size={40}
        />
        <div className="min-w-0 flex-1">
          {story.rebloggedBy ? (
            <p className="text-caption text-muted">
              Reblogged by{' '}
              <span className="font-medium text-fg-secondary">@{story.rebloggedBy}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-weight-label text-body-sm text-fg">{displayAuthor}</span>
            <span className="text-caption text-muted">@{story.authorName}</span>
          </div>
          <time className="text-caption text-fg-tertiary" dateTime={displayTimeIso}>
            {dateLabel}
          </time>
        </div>
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
        <p className="mt-2 whitespace-pre-wrap text-body text-fg-secondary">{story.excerpt}</p>
        {story.objects && story.objects.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2 p-0" aria-label="Tagged objects">
            {story.objects.map((o) => (
              <li key={o.objectId} className="list-none">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-control px-2 py-0.5 text-caption text-fg-secondary">
                  {o.avatarUrl ? (
                    <img
                      src={o.avatarUrl}
                      alt=""
                      className="size-4 shrink-0 rounded-full"
                      width={16}
                      height={16}
                    />
                  ) : null}
                  <span className="truncate">{o.name ?? o.objectId}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {story.isNsfw ? (
          <p className="mt-2 text-caption text-muted" role="status">
            NSFW
          </p>
        ) : null}
      </div>

      <footer className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
        {(story.children != null || voteLine) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted">
            {story.children != null ? (
              <span>
                {story.children} {story.children === 1 ? 'comment' : 'comments'}
              </span>
            ) : null}
            {voteLine ? <span>{voteLine}</span> : null}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-btn border border-border bg-surface-control px-3 py-1.5 text-caption text-fg-disabled">
            Like
          </span>
          <span className="rounded-btn border border-border bg-surface-control px-3 py-1.5 text-caption text-fg-disabled">
            Reblog
          </span>
          <span className="rounded-btn border border-border bg-surface-control px-3 py-1.5 text-caption text-fg-disabled">
            Bookmark
          </span>
        </div>
      </footer>
    </article>
  );
}
