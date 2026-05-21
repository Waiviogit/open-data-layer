'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { queryApiCacheTags } from './query-api-cache-tags';

function objectPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId.trim())}`;
}

function userProfilePath(accountName: string): string {
  return `/user-profile/${encodeURIComponent(accountName.trim())}`;
}

/** After on-chain mutations on an object page (authority, follow, updates, rating, …). */
export async function revalidateObjectAfterBroadcast(objectId: string): Promise<void> {
  const id = objectId.trim();
  if (id.length === 0) {
    return;
  }
  updateTag(queryApiCacheTags.objectAuthority(id));
  updateTag(queryApiCacheTags.objectFollowers(id));
  updateTag(queryApiCacheTags.objectUpdates(id));
  revalidatePath(objectPath(id), 'layout');
}

/** User profile hero, followers/following tabs, follow bell. */
export async function revalidateUserSocialAfterBroadcast(accountName: string): Promise<void> {
  const name = accountName.trim().toLowerCase();
  if (name.length === 0) {
    return;
  }
  updateTag(queryApiCacheTags.userProfile(name));
  updateTag(queryApiCacheTags.userFollowers(name));
  updateTag(queryApiCacheTags.userFollowing(name));
  updateTag(queryApiCacheTags.userFollowingObjects(name));
  revalidatePath(userProfilePath(name), 'layout');
}

/** Profile feed tabs (posts, threads, comments, mentions) after vote/comment broadcast. */
export async function revalidateUserFeedAfterBroadcast(accountName: string): Promise<void> {
  const name = accountName.trim().toLowerCase();
  if (name.length === 0) {
    return;
  }
  updateTag(queryApiCacheTags.userBlogFeed(name));
  updateTag(queryApiCacheTags.userThreadsFeed(name));
  updateTag(queryApiCacheTags.userCommentsFeed(name));
  updateTag(queryApiCacheTags.userMentionsFeed(name));
  revalidatePath(userProfilePath(name), 'layout');
}
