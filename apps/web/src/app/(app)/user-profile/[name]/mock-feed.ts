import type { FeedStoryView, FeedTab } from '@/modules/feed';

const DEMO_ACCOUNT = 'demo';

/**
 * Route-layer mock factory. Presentational components must not import this file.
 * Returns sample rows only for the `demo` account (case-insensitive).
 */
export function getMockFeedItems(accountName: string, tab: FeedTab): FeedStoryView[] {
  if (accountName.trim().toLowerCase() !== DEMO_ACCOUNT) {
    return [];
  }

  const t1 = '2026-04-01T14:30:00.000Z';
  const t2 = '2026-04-02T09:15:00.000Z';

  switch (tab) {
    case 'posts':
      return [
        {
          id: 'mock-post-1',
          authorName: 'demo',
          authorDisplayName: 'Demo',
          authorAvatarUrl:
            'https://images.hive.blog/u/demo/avatar/small',
          createdAt: t1,
          title: 'Mock post — Open Data Layer',
          excerpt:
            'Sample body preview for the posts tab. Replace with API-backed feed when wired.',
          permalinkPath: '/user-profile/demo',
          isNsfw: false,
        },
        {
          id: 'mock-post-2',
          authorName: 'alice',
          authorDisplayName: 'Alice',
          createdAt: t2,
          title: 'Second mock row (another author)',
          excerpt: 'Demonstrates a multi-author list in the same feed.',
          permalinkPath: '/user-profile/alice',
        },
      ];
    case 'threads':
      return [
        {
          id: 'mock-thread-1',
          authorName: 'demo',
          createdAt: t1,
          title: 'Mock thread root',
          excerpt: 'Threads tab mock — conversation preview text goes here.',
          permalinkPath: '/user-profile/demo/threads',
        },
      ];
    case 'comments':
      return [
        {
          id: 'mock-comment-1',
          authorName: 'demo',
          createdAt: t2,
          title: 'Re: Mock thread root',
          excerpt: 'Comments tab mock — excerpt of the reply body.',
          permalinkPath: '/user-profile/demo/comments',
        },
      ];
    case 'mentions':
      return [
        {
          id: 'mock-mention-1',
          authorName: 'bob',
          authorDisplayName: 'Bob',
          createdAt: t1,
          title: 'Post mentioning @demo',
          excerpt: 'Mentions tab mock — @demo appears in this preview.',
          permalinkPath: '/user-profile/demo/mentions',
        },
      ];
    case 'activity':
      return [
        {
          id: 'mock-activity-1',
          authorName: 'demo',
          createdAt: t2,
          title: 'Vote on a post',
          excerpt: 'Activity tab mock — e.g. vote, follow, or transfer event summary.',
          permalinkPath: '/user-profile/demo/activity',
        },
        {
          id: 'mock-activity-2',
          authorName: 'demo',
          createdAt: t1,
          title: 'Started following @alice',
          excerpt: 'Second activity row for layout check.',
        },
      ];
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}
