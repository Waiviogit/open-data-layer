export interface UserProfileView {
  name: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  followerCount: number;
  followingCount: number;
  postingCount: number;
  reputation: number;
  /** True when `X-Viewer` follows this profile (`user_subscriptions`). */
  is_following: boolean;
  /** Bell flag on that subscription; false when not following or bell is null. */
  viewer_bell: boolean;
}
