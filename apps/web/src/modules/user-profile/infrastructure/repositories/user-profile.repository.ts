import { userProfileViewSchema } from '../../application/dto/user-profile.dto';
import type { UserProfileRepository } from '../../domain/ports/user-profile.repository';
import type { UserProfileView } from '../../domain/types/user-profile-view';
import { queryApiFetch } from '../clients/query-api.client';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

export function createHttpUserProfileRepository(): UserProfileRepository {
  return {
    async findByName(
      name: string,
      viewer?: string | null,
      locale?: string | null,
    ): Promise<UserProfileView | null> {
      const path = `/query/v1/users/${encodeURIComponent(name)}/profile`;
      const viewerTrimmed = viewer?.trim();
      const headers: Record<string, string> = {};
      if (viewerTrimmed && viewerTrimmed.length > 0) {
        headers['X-Viewer'] = viewerTrimmed;
      }
      const localeTrimmed = locale?.trim();
      if (localeTrimmed && localeTrimmed.length > 0) {
        headers['X-Locale'] = localeTrimmed;
        headers['Accept-Language'] = localeTrimmed;
      }
      const data = await queryApiFetch<unknown>(path, {
        headers,
        cacheTags: [queryApiCacheTags.userProfile(name)],
      });
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
