import { FeedList, type FeedTab } from '@/modules/feed';

import { getMockFeedItems } from './mock-feed';

type FeedProfileContentProps = {
  accountName: string;
  feedTab: FeedTab;
};

export function FeedProfileContent({ accountName, feedTab }: FeedProfileContentProps) {
  const items = getMockFeedItems(accountName, feedTab);

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

  return <FeedList items={items} feedTab={feedTab} />;
}
