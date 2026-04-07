'use client';

import { useState, useTransition } from 'react';

import type { UserBlogFeedPage } from '@/modules/feed/application/dto/user-blog-feed-page.dto';
import type { FeedTab } from '@/modules/feed/domain/feed-tab';
import { FeedList } from '@/modules/feed/presentation';
import { FeedColumn } from '@/shared/presentation/layout';

import { loadMoreUserBlogFeedAction } from './blog-feed.actions';

type BlogFeedPostsListProps = {
  accountName: string;
  initialPage: UserBlogFeedPage;
  feedTab: FeedTab;
};

export function BlogFeedPostsList({
  accountName,
  initialPage,
  feedTab,
}: BlogFeedPostsListProps) {
  const [items, setItems] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.cursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <section
        className="rounded-card border border-border bg-surface/80 p-card-padding"
        aria-labelledby="feed-empty-title"
      >
        <h2 id="feed-empty-title" className="text-lg font-semibold text-fg">
          Feed
        </h2>
        <p className="mt-2 text-sm text-muted">No items to show yet.</p>
      </section>
    );
  }

  return (
    <FeedColumn>
      <FeedList items={items} feedTab={feedTab} />
      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-medium text-fg hover:bg-surface-control-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
            disabled={pending || !cursor}
            onClick={() => {
              if (!cursor) {
                return;
              }
              startTransition(async () => {
                const next = await loadMoreUserBlogFeedAction(accountName, cursor);
                setItems((prev) => [...prev, ...next.items]);
                setCursor(next.cursor);
                setHasMore(next.hasMore);
              });
            }}
          >
            {pending ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </FeedColumn>
  );
}
