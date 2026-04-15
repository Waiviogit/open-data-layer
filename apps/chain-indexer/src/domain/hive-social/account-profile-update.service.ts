import { Injectable, Logger } from '@nestjs/common';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import type { AccountCurrentUpdate } from '@opden-data-layer/core';

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function profileFromParsed(parsed: Record<string, unknown>): {
  alias: string;
  profile_image: string | null;
} {
  const profile = parsed['profile'];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { alias: '', profile_image: null };
  }
  const p = profile as Record<string, unknown>;
  const name = typeof p['name'] === 'string' ? p['name'] : '';
  const img = typeof p['profile_image'] === 'string' ? p['profile_image'] : null;
  return { alias: name, profile_image: img };
}

/**
 * Hive `account_update` → display fields on accounts_current only (no upsert).
 * @see tmp/user-social-parsers-spec.md §3
 */
@Injectable()
export class AccountProfileUpdateService {
  private readonly logger = new Logger(AccountProfileUpdateService.name);

  constructor(private readonly accounts: AccountsCurrentRepository) {}

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
      const { alias, profile_image } = profileFromParsed(parsed);
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
      const { alias, profile_image } = profileFromParsed(parsed);
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
      this.logger.debug(
        `account_update: no accounts_current row for ${account}; skip (no upsert)`,
      );
      return;
    }

    await this.accounts.update(account, update);
  }
}
