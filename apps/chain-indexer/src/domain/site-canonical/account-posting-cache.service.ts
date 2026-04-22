import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientFactory } from '@opden-data-layer/clients';
import { HiveClient } from '@opden-data-layer/clients';
import { redisKey } from '../../constants/redis-keys';

@Injectable()
export class AccountPostingCacheService {
  private readonly logger = new Logger(AccountPostingCacheService.name);

  constructor(
    private readonly redisFactory: RedisClientFactory,
    private readonly hiveClient: HiveClient,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns `posting_json_metadata` JSON string from Hive, with Redis cache (db0, TTL).
   */
  async getPostingJsonMetadata(accountName: string): Promise<string | null> {
    const name = accountName.trim().toLowerCase();
    if (name.length === 0) {
      return null;
    }
    const ttl = this.config.get<number>(
      'siteCanonical.accountCacheTtlSec',
      600,
    );
    const key = redisKey.accountPostingJson(name);
    const redis = this.redisFactory.getClient(0);
    const hit = await redis.get(key);
    if (hit !== null) {
      return hit.length > 0 ? hit : null;
    }
    try {
      const accounts = await this.hiveClient.getAccounts([name]);
      const row = accounts[0];
      const raw = row?.posting_json_metadata ?? '';
      await redis.set(key, raw, ttl);
      return raw.length > 0 ? raw : null;
    } catch (e) {
      this.logger.warn(
        `getAccounts failed for ${name}: ${(e as Error).message}`,
      );
      return null;
    }
  }
}
