import { Injectable } from '@nestjs/common';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '@opden-data-layer/objects-domain';
import { GovernanceResolverService } from '../governance';
import { AffiliateCodesService } from './affiliate-codes.service';
import { buildAffiliateLinks } from './build-affiliate-links';
import type {
  AffiliateConfig,
  AffiliateEnrichContext,
  AffiliateEnrichTarget,
} from './affiliate.types';
import { readProductIds } from './read-product-ids';

@Injectable()
export class AffiliateLinksEnricher {
  constructor(
    private readonly affiliateCodes: AffiliateCodesService,
    private readonly governanceResolver: GovernanceResolverService,
  ) {}

  async enrich(
    targets: AffiliateEnrichTarget[],
    ctx: AffiliateEnrichContext & { governance?: GovernanceSnapshot },
  ): Promise<void> {
    if (targets.length === 0) {
      return;
    }

    const governance =
      ctx.governance ??
      (await this.governanceResolver.resolveMergedForObjectView(
        ctx.governanceObjectIdFromHeader,
      ));

    const [governanceConfigs, personalConfigs] = await Promise.all([
      this.affiliateCodes.getGovernanceConfigs(governance, ctx.governanceObjectIdFromHeader),
      ctx.personalAccount
        ? this.affiliateCodes.getPersonalConfigs(
            ctx.personalAccount,
            governance,
            ctx.governanceObjectIdFromHeader,
          )
        : Promise.resolve([] as AffiliateConfig[]),
    ]);

    const byObjectId = new Map<string, AffiliateConfig>();
    for (const config of governanceConfigs) {
      byObjectId.set(config.objectId, config);
    }
    for (const config of personalConfigs) {
      byObjectId.set(config.objectId, config);
    }
    const configs = [...byObjectId.values()];
    if (configs.length === 0) {
      return;
    }

    for (const target of targets) {
      if (target.object_type === OBJECT_TYPES.RECIPE) {
        continue;
      }
      const productIds = readProductIds(target.fields);
      if (productIds.length === 0) {
        continue;
      }
      const links = buildAffiliateLinks(configs, productIds, ctx.countryCode);
      if (links.length > 0) {
        target.affiliateLinks = links;
      }
    }
  }
}
