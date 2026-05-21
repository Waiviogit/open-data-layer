/** Next.js Data Cache tags for query-api GET responses (see `revalidate-after-broadcast.server.ts`). */

export const queryApiCacheTags = {
  objectAuthority: (objectId: string) =>
    `query-api:object:${objectId.trim()}:authority`,
  objectFollowers: (objectId: string) =>
    `query-api:object:${objectId.trim()}:followers`,
  objectUpdates: (objectId: string) => `query-api:object:${objectId.trim()}:updates`,
  userProfile: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:profile`,
  userFollowers: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:followers`,
  userFollowing: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:following`,
  userFollowingObjects: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:following-objects`,
  userBlogFeed: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:blog-feed`,
  userThreadsFeed: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:threads-feed`,
  userCommentsFeed: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:comments-feed`,
  userMentionsFeed: (accountName: string) =>
    `query-api:user:${accountName.trim().toLowerCase()}:mentions-feed`,
} as const;
