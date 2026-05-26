import type { UserProfileRepository } from '../../domain/ports/user-profile.repository';
import type { UserProfileView } from '../../domain/types/user-profile-view';
import type { UserProfileShellUser } from '../../domain/types/user-profile-shell-user';

export function createGetUserProfileQuery(repo: UserProfileRepository) {
  return async function getUserProfile(
    name: string,
    viewer?: string | null,
    locale?: string | null,
  ): Promise<UserProfileShellUser | null> {
    const view = await repo.findByName(name, viewer, locale);
    if (!view) {
      return null;
    }
    return mapViewToShellUser(view);
  };
}

function mapViewToShellUser(view: UserProfileView): UserProfileShellUser {
  return {
    id: view.name,
    name: view.name,
    displayName: view.displayName,
    bio: view.bio,
    followerCount: view.followerCount,
    followingCount: view.followingCount,
    postingCount: view.postingCount,
    coverImageUrl: view.coverImageUrl,
    avatarUrl: view.avatarUrl,
    isFollowing: view.is_following,
    viewerBell: view.viewer_bell,
  };
}
