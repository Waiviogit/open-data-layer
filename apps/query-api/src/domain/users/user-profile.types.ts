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
}
