import { Injectable, Logger } from '@nestjs/common';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { AccountSyncQueueRepository } from '../../repositories/account-sync-queue.repository';
import type { AccountCurrentUpdate } from '@opden-data-layer/core';
import { parseJsonObject, profileAliasAndImageFromHiveStrings } from './account-hive-metadata.util';

/**
 * Hive `account_update` → display fields on accounts_current only (no upsert).
 * @see tmp/user-social-parsers-spec.md §3
 */
@Injectable()
export class AccountProfileUpdateService {
  private readonly logger = new Logger(AccountProfileUpdateService.name);

  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly accountSyncQueue: AccountSyncQueueRepository,
  ) {}

  async handleAccountUpdate(payload: Record<string, unknown>): Promise<void> {
    const account =
      typeof payload['account'] === 'string' ? payload['account'].trim() : '';
    if (!account) {
      return;
    }

    const jmRaw = payload['json_metadata'];
    const pjmRaw = payload['posting_json_metadata'];
    const jm = typeof jmRaw === 'string' && jmRaw.trim() ? jmRaw : null;
    const pjm = typeof pjmRaw === 'string' && pjmRaw.trim() ? pjmRaw : null;

    if (!jm && !pjm) {
      return;
    }

    let update: AccountCurrentUpdate;

    if (pjm) {
      const parsed = parseJsonObject(pjm);
      if (!parsed) {
        this.logger.warn(`account_update: invalid posting_json_metadata for ${account}`);
        return;
      }
      const { alias, profile_image } = profileAliasAndImageFromHiveStrings(pjm, jm ?? '');
      update = {
        posting_json_metadata: pjm,
        alias,
        profile_image,
      };
    } else if (jm) {
      const parsed = parseJsonObject(jm);
      if (!parsed) {
        this.logger.warn(`account_update: invalid json_metadata for ${account}`);
        return;
      }
      const { alias, profile_image } = profileAliasAndImageFromHiveStrings('', jm);
      update = {
        json_metadata: jm,
        alias,
        profile_image,
      };
    } else {
      return;
    }

    const row = await this.accounts.findByName(account);
    if (!row) {
      const enqueuedAt = Math.floor(Date.now() / 1000);
      await this.accountSyncQueue.enqueue(account, enqueuedAt);
      this.logger.debug(
        `account_update: no accounts_current row for ${account}; enqueued account sync`,
      );
      return;
    }

    await this.accounts.update(account, update);
  }
}
