import type { UserProfileView } from '../types/user-profile-view';

export interface UserProfileRepository {
  findByName(
    name: string,
    viewer?: string | null,
    locale?: string | null,
  ): Promise<UserProfileView | null>;
}
