import type { UserProfileRepository } from '../../domain/ports/user-profile.repository';
import type { UserProfileView } from '../../domain/types/user-profile-view';
import type { UserProfileShellUser } from '../../domain/types/user-profile-shell-user';

export function createGetUserProfileQuery(repo: UserProfileRepository) {
  return async function getUserProfile(
    name: string,
  ): Promise<UserProfileShellUser | null> {
    const view = await repo.findByName(name);
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
  };
}
