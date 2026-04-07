/** Props shape for profile hero / shell (shell-only fields). */
export type UserProfileShellUser = {
  id: string;
  name: string;
  displayName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postingCount: number;
  coverImageUrl: string | null;
  avatarUrl: string | null;
};
