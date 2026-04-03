import { createGetUserProfileQuery } from './application/queries/get-user-profile.query';
import { createHttpUserProfileRepository } from './infrastructure/repositories/user-profile.repository';

export * from './presentation';

export { createGetUserProfileQuery } from './application/queries/get-user-profile.query';
export type { UserProfileView } from './domain/types/user-profile-view';

export const getUserProfileQuery = createGetUserProfileQuery(
  createHttpUserProfileRepository(),
);
