import { Injectable, Logger } from '@nestjs/common';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import type { NewAccountCurrent } from '@opden-data-layer/core';

function extractNewAccountName(payload: Record<string, unknown>): string | null {
  const n = payload['new_account_name'];
  return typeof n === 'string' && n.trim().length > 0 ? n.trim() : null;
}

/**
 * Minimal row when a Hive account first appears on chain (create ops).
 * @see tmp/user-social-parsers-spec.md §2
 */
@Injectable()
export class AccountEnsureService {
  private readonly logger = new Logger(AccountEnsureService.name);

  constructor(private readonly accounts: AccountsCurrentRepository) {}

  async ensureFromCreateAccountPayload(payload: Record<string, unknown>): Promise<void> {
    const name = extractNewAccountName(payload);
    if (!name) {
      return;
    }
    await this.ensureUserExists(name);
  }

  async ensureUserExists(name: string, updatedAtUnix?: number): Promise<void> {
    const existing = await this.accounts.findByName(name);
    if (existing) {
      return;
    }
    const now = updatedAtUnix ?? Math.floor(Date.now() / 1000);
    const row: NewAccountCurrent = {
      name,
      hive_id: null,
      json_metadata: null,
      posting_json_metadata: null,
      created: null,
      comment_count: 0,
      lifetime_vote_count: 0,
      post_count: 0,
      last_post: null,
      last_root_post: null,
      object_reputation: 0,
      updated_at_unix: now,
      alias: null,
      profile_image: null,
      wobjects_weight: 0,
      last_posts_count: 0,
      users_following_count: 0,
      followers_count: 0,
      stage_version: 0,
      referral_status: null,
      last_activity: null,
    };
    try {
      await this.accounts.create(row);
    } catch (err: unknown) {
      this.logger.warn(
        `ensureUserExists(${name}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
