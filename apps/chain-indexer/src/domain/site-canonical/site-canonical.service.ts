import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  buildFallbackCanonicalUrl,
  extractWebsiteFromPostingJson,
  normalizeWebsiteToHttpsUrl,
  runSiteCanonicalPipeline,
} from '@opden-data-layer/site-canonical';
import { sql } from 'kysely';
import {
  AggregatedObjectRepository,
  ObjectsCoreRepository,
  SiteRegistryRepository,
} from '../../repositories';
import { GovernanceCacheService } from '../governance/governance-cache.service';
import { AccountPostingCacheService } from './account-posting-cache.service';
import { KYSELY } from '../../database';
import { Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../../database';

const RESOLVE_LOCALE = 'en-US' as const;

@Injectable()
export class SiteCanonicalService {
  private readonly logger = new Logger(SiteCanonicalService.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly config: ConfigService,
    private readonly aggregatedObjectRepository: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceCacheService: GovernanceCacheService,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly siteRegistryRepository: SiteRegistryRepository,
    private readonly accountPostingCache: AccountPostingCacheService,
  ) {}

  async recomputeForObject(objectId: string): Promise<void> {
    const trimmed = objectId.trim();
    if (trimmed.length === 0) {
      return;
    }
    const fallbackOrigin = this.config.get<string>(
      'siteCanonical.fallbackOrigin',
      'https://example.com',
    );
    const { objects, voterReputations } =
      await this.aggregatedObjectRepository.loadByObjectIds([trimmed]);
    const aggregated = objects[0];
    if (!aggregated) {
      this.logger.warn(`site canonical: object '${trimmed}' missing`);
      return;
    }
    const governance = await this.governanceCacheService.resolve(trimmed);
    const views = this.objectViewService.resolve(
      [aggregated],
      voterReputations,
      {
        update_types: [UPDATE_TYPES.DESCRIPTION],
        governance,
        locale: RESOLVE_LOCALE,
      },
    );
    const view = views[0];
    const descField = view?.fields[UPDATE_TYPES.DESCRIPTION];
    const winning = descField?.values[0];
    if (!winning || winning.validity_status !== 'VALID') {
      await this.applyFallbackOnly(trimmed, fallbackOrigin, null);
      return;
    }
    const creator = winning.creator;
    const posting = await this.accountPostingCache.getPostingJsonMetadata(
      creator,
    );
    const websiteRaw = extractWebsiteFromPostingJson(posting);
    const websiteNorm = websiteRaw
      ? normalizeWebsiteToHttpsUrl(websiteRaw)
      : null;
    const pipeline = await runSiteCanonicalPipeline(
      {
        objectId: trimmed,
        postingJsonMetadata: posting,
        fallbackOrigin,
      },
      {},
    );
    const existingRegistry =
      await this.siteRegistryRepository.findByCreator(creator);
    const consecutiveFailCount = pipeline.usedFallback
      ? (existingRegistry?.consecutive_fail_count ?? 0) + 1
      : 0;

    await this.updateObjectCoreConditionally(
      trimmed,
      pipeline.canonicalUrl,
      creator,
    );
    await this.siteRegistryRepository.upsertByCreator({
      creator,
      website_raw: websiteRaw,
      website_normalized: websiteNorm,
      effective_canonical: pipeline.canonicalUrl,
      site_state: pipeline.usedFallback ? 'fallback' : 'active',
      is_reachable: !pipeline.usedFallback,
      last_checked_at: new Date(),
      last_success_at: pipeline.usedFallback ? null : new Date(),
      last_error: pipeline.usedFallback ? (pipeline.detail ?? 'fallback') : null,
      consecutive_fail_count: consecutiveFailCount,
      http_status_code: null,
    });
  }

  private async applyFallbackOnly(
    objectId: string,
    fallbackOrigin: string,
    canonicalCreator: string | null,
  ): Promise<void> {
    const url = buildFallbackCanonicalUrl(objectId, fallbackOrigin);
    await this.updateObjectCoreConditionally(
      objectId,
      url,
      canonicalCreator,
    );
  }

  private async updateObjectCoreConditionally(
    objectId: string,
    canonical: string | null,
    canonicalCreator: string | null,
  ): Promise<void> {
    const r = await this.db
      .updateTable('objects_core')
      .set({ canonical, canonical_creator: canonicalCreator })
      .where('object_id', '=', objectId)
      .where(
        sql<boolean>`(objects_core.canonical IS DISTINCT FROM ${canonical} OR objects_core.canonical_creator IS DISTINCT FROM ${canonicalCreator})`,
      )
      .executeTakeFirst();
    if (!r || !r.numUpdatedRows) {
      return;
    }
  }
}
