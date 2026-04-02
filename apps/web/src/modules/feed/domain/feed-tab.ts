export const FEED_TABS = ['posts', 'threads', 'comments', 'mentions', 'activity'] as const;

export type FeedTab = (typeof FEED_TABS)[number];
