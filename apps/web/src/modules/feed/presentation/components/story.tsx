import Link from 'next/link';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import type { FeedTab } from '../../domain/feed-tab';

type StoryProps = {
  story: FeedStoryView;
  feedTab?: FeedTab;
};

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function Story({ story, feedTab }: StoryProps) {
  const displayAuthor = story.authorDisplayName ?? story.authorName;
  const dateLabel = formatCreatedAt(story.createdAt);

  return (
    <article
      className="rounded-card border border-border bg-surface/80 p-card-padding shadow-whisper"
      aria-labelledby={`story-title-${story.id}`}
      data-feed-tab={feedTab}
    >
      <header className="flex gap-3">
        <div
          className="size-10 shrink-0 rounded-circle bg-tertiary"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-weight-label text-body-sm text-fg">{displayAuthor}</span>
            <span className="text-caption text-muted">@{story.authorName}</span>
          </div>
          <time className="text-caption text-fg-tertiary" dateTime={story.createdAt}>
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
        {story.isNsfw ? (
          <p className="mt-2 text-caption text-muted" role="status">
            Tagged NSFW (preview rules not wired yet).
          </p>
        ) : null}
      </div>

      <footer className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        <span className="rounded-btn border border-border bg-surface-control px-3 py-1.5 text-caption text-fg-disabled">
          Like
        </span>
        <span className="rounded-btn border border-border bg-surface-control px-3 py-1.5 text-caption text-fg-disabled">
          Reblog
        </span>
        <span className="rounded-btn border border-border bg-surface-control px-3 py-1.5 text-caption text-fg-disabled">
          Bookmark
        </span>
      </footer>
    </article>
  );
}
