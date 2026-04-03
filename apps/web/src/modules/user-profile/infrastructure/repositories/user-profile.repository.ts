import { userProfileViewSchema } from '../../application/dto/user-profile.dto';
import type { UserProfileRepository } from '../../domain/ports/user-profile.repository';
import type { UserProfileView } from '../../domain/types/user-profile-view';
import { queryApiFetch } from '../clients/query-api.client';

export function createHttpUserProfileRepository(): UserProfileRepository {
  return {
    async findByName(name: string): Promise<UserProfileView | null> {
      const path = `/api/v1/users/${encodeURIComponent(name)}/profile`;
      const data = await queryApiFetch<unknown>(path);
      if (data === null) {
        return null;
      }
      const parsed = userProfileViewSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(
          `Invalid user profile response: ${parsed.error.flatten().toString()}`,
        );
      }
      return parsed.data;
    },
  };
}
