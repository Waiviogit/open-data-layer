import { Injectable } from '@nestjs/common';
import { AccountsCurrentRepository } from '../../repositories';
import { mapAccountToUserProfileView } from './account-mapper';
import type { UserProfileView } from './user-profile.types';

export { parsePostingMetadata } from './parse-posting-metadata';
export type { UserProfileView } from './user-profile.types';

@Injectable()
export class GetUserProfileEndpoint {
  constructor(private readonly accounts: AccountsCurrentRepository) {}

  async execute(accountName: string): Promise<UserProfileView | null> {
    const row = await this.accounts.findByName(accountName);
    if (!row) {
      return null;
    }
    return mapAccountToUserProfileView(row);
  }
}
