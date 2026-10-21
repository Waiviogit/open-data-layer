import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientFactory } from '@opden-data-layer/clients';
import { AFFILIATE_CODE_SCOPE } from '@opden-data-layer/core';
import {
  DEFAULT_GOVERNANCE_SNAPSHOT,
  ObjectViewService,
  type GovernanceSnapshot,
} from '@opden-data-layer/objects-domain';
import { AFFILIATE_CODES_CACHE_TTL_SEC } from '../../constants/cache.constants';
import { redisKey } from '../../constants/redis-keys';
import { AffiliateObjectsRepository, AggregatedObjectRepository } from '../../repositories';
import { AFFILIATE_UPDATE_TYPES } from './affiliate.constants';
import type { AffiliateConfig } from './affiliate.types';
import { filterConfigsByScope, parseAffiliateConfig } from './parse-affiliate-config';

@Injectable()
export class AffiliateCodesService {
  private readonly logger = new Logger(AffiliateCodesService.name);

  constructor(
    private readonly affiliateObjectsRepo: AffiliateObjectsRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly redisFactory: RedisClientFactory,
    private readonly config: ConfigService,
  ) {}

  async getGovernanceConfigs(
    governance: GovernanceSnapshot,
    headerGovernanceId?: string,
  ): Promise<AffiliateConfig[]> {
    const platformId = (this.config.get<string>('governance.objectId') ?? '').trim();
    const headerId = headerGovernanceId?.trim() ?? '';
    const key = redisKey.affiliateGovernanceCodes(platformId, headerId);
    const cached = await this.readCache(key);
    if (cached) {
      return cached;
    }

    const objectIds =
      governance.authorities.length === 0
        ? await this.affiliateObjectsRepo.findAllActiveAffiliateObjectIds()
        : await this.affiliateObjectsRepo.findObjectIdsForAuthorities(governance.authorities);
    if (objectIds == null) {
      this.logger.warn('Affiliate object id lookup failed; skipping cache write');
      return [];
    }

    const configs = filterConfigsByScope(
      await this.loadConfigs(objectIds, governance),
      AFFILIATE_CODE_SCOPE.GOVERNANCE,
    );
    await this.writeCache(key, configs);
    return configs;
  }

  async getPersonalConfigs(
    account: string,
    governance: GovernanceSnapshot,
    headerGovernanceId?: string,
  ): Promise<AffiliateConfig[]> {
    const trimmed = account.trim();
    if (!trimmed) {
      return [];
    }
    const platformId = (this.config.get<string>('governance.objectId') ?? '').trim();
    const headerId = headerGovernanceId?.trim() ?? '';
    const key = redisKey.affiliatePersonalCodes(trimmed, platformId, headerId);
    const cached = await this.readCache(key);
    if (cached) {
      return cached;
    }
    const objectIds = await this.affiliateObjectsRepo.findPersonalObjectIdsForCreator(trimmed);
    if (objectIds == null) {
      this.logger.warn('Affiliate object id lookup failed; skipping cache write');
      return [];
    }
    const configs = filterConfigsByScope(
      await this.loadConfigs(objectIds, governance, {
        includeRejected: true,
        personalCreator: trimmed,
      }),
      AFFILIATE_CODE_SCOPE.PERSONAL,
      trimmed,
    );
    await this.writeCache(key, configs);
    return configs;
  }

  private async loadConfigs(
    objectIds: string[],
    governance: GovernanceSnapshot,
    options?: { includeRejected?: boolean; personalCreator?: string },
  ): Promise<AffiliateConfig[]> {
    if (objectIds.length === 0) {
      return [];
    }
    const { objects, voterWaivPowers } = await this.aggregatedObjectRepo.loadByObjectIds(
      objectIds,
      { includeRankVoteProjection: false },
    );
    const views = this.objectViewService.resolve(objects, voterWaivPowers, {
      update_types: [...AFFILIATE_UPDATE_TYPES],
      include_rejected: options?.includeRejected === true,
      governance: governance ?? DEFAULT_GOVERNANCE_SNAPSHOT,
    });
    return views
      .map((view) =>
        parseAffiliateConfig(view, { personalCreator: options?.personalCreator }),
      )
      .filter((c): c is AffiliateConfig => c != null);
  }

  private async readCache(key: string): Promise<AffiliateConfig[] | null> {
    try {
      const raw = await this.redisFactory.getClient().get(key);
      if (raw == null || raw === '') {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed as AffiliateConfig[];
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  private async writeCache(key: string, configs: AffiliateConfig[]): Promise<void> {
    try {
      await this.redisFactory.getClient().set(
        key,
        JSON.stringify(configs),
        AFFILIATE_CODES_CACHE_TTL_SEC,
      );
    } catch (e) {
      this.logger.error((e as Error).message);
    }
  }
}
