/** Read model returned by query-api `GET /api/v1/users/:name/profile`. */
export type UserProfileView = {
  name: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  followerCount: number;
  followingCount: number;
  postingCount: number;
  reputation: number;
};
