import { cache } from 'react';

import { createGetUserProfileQuery } from './application/queries/get-user-profile.query';
import { createHttpUserProfileRepository } from './infrastructure/repositories/user-profile.repository';

export * from './presentation';

export { createGetUserProfileQuery } from './application/queries/get-user-profile.query';
export type { UserProfileView } from './domain/types/user-profile-view';

const userProfileRepository = createHttpUserProfileRepository();

export const getUserProfileQuery = cache(
  createGetUserProfileQuery(userProfileRepository),
);

export const getUserProfileViewQuery = cache(
  async (name: string, viewer?: string | null, locale?: string | null) =>
    userProfileRepository.findByName(name, viewer, locale),
);
