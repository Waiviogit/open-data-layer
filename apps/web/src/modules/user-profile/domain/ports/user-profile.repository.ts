import type { UserProfileView } from '../types/user-profile-view';

export interface UserProfileRepository {
  findByName(name: string): Promise<UserProfileView | null>;
}
