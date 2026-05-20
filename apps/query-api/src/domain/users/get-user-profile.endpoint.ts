import { Injectable } from '@nestjs/common';
import { AccountsCurrentRepository, UserSubscriptionsRepository } from '../../repositories';
import { mapAccountToUserProfileView } from './account-mapper';
import type { UserProfileView } from './user-profile.types';

export { parsePostingMetadata } from './parse-posting-metadata';
export type { UserProfileView } from './user-profile.types';

@Injectable()
export class GetUserProfileEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly subscriptions: UserSubscriptionsRepository,
  ) {}

  async execute(
    accountName: string,
    viewerAccount?: string | null,
  ): Promise<UserProfileView | null> {
    const viewer = viewerAccount?.trim() || null;
    const [row, viewerFollow] = await Promise.all([
      this.accounts.findByName(accountName),
      viewer
        ? this.subscriptions.findByFollowerAndFollowing(viewer, accountName)
        : Promise.resolve(null),
    ]);
    if (!row) {
      return null;
    }
    return {
      ...mapAccountToUserProfileView(row),
      is_following: viewerFollow != null,
      viewer_bell: viewerFollow?.bell === true,
    };
  }
}
