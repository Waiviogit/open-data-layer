import { FeedList, getUserBlogFeedPageQuery, type FeedTab } from '@/modules/feed';
import { FeedColumn } from '@/shared/presentation/layout';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { BlogFeedPostsList } from './blog-feed-posts-list';
import { getMockFeedItems } from './mock-feed';

type FeedProfileContentProps = {
  accountName: string;
  feedTab: FeedTab;
};

export async function FeedProfileContent({ accountName, feedTab }: FeedProfileContentProps) {
  const auth = createCookieAuthContextProvider();
  const currentUser = await auth.getUser();
  const currentUsername = currentUser?.username ?? null;

  if (feedTab === 'posts') {
    const page = await getUserBlogFeedPageQuery(accountName);
    return (
      <BlogFeedPostsList
        accountName={accountName}
        initialPage={page}
        feedTab={feedTab}
        currentUsername={currentUsername}
      />
    );
  }

  const items = getMockFeedItems(accountName, feedTab);

  if (items.length === 0) {
    return (
      <FeedColumn>
        <section
          className="rounded-card border border-border bg-surface/80 p-card-padding"
          aria-labelledby="feed-empty-title"
        >
          <h2 id="feed-empty-title" className="text-lg font-semibold text-fg">
            Feed
          </h2>
          <p className="mt-2 text-sm text-muted">No items to show yet.</p>
        </section>
      </FeedColumn>
    );
  }

  return (
    <FeedColumn>
      <FeedList items={items} feedTab={feedTab} currentUsername={currentUsername} />
    </FeedColumn>
  );
}
