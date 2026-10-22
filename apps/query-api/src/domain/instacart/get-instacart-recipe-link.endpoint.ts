import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientFactory } from '@opden-data-layer/clients';
import { OBJECT_PAGE_VISIBLE_STATUSES, OBJECT_TYPES, UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { redisKey } from '../../constants/redis-keys';
import { AggregatedObjectRepository } from '../../repositories';
import { AffiliateCodesService } from '../affiliate/affiliate-codes.service';
import { GovernanceResolverService } from '../governance';
import { ObjectProjectionService } from '../object-projection/object-projection.service';
import { OpenAiJsonClient } from '../openai';
import {
  createInstacartRecipeLink,
  InstacartLinkRejectedError,
} from './create-instacart-recipe-link';
import { pickInstacartAffiliateCode } from './instacart-affiliate-code';
import { hasInstacartIdentifier } from './has-instacart-identifier';
import { InstacartIdpClient } from './instacart-idp.client';

const INSTACART_UPDATE_TYPES = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.DESCRIPTION,
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.INGREDIENTS,
  UPDATE_TYPES.SERVINGS,
  UPDATE_TYPES.IDENTIFIER,
];

export type GetInstacartRecipeLinkInput = {
  objectId: string;
  locale: string;
  countryCode: string | null;
  governanceObjectIdFromHeader?: string;
};

@Injectable()
export class GetInstacartRecipeLinkEndpoint {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectProjectionService: ObjectProjectionService,
    private readonly affiliateCodes: AffiliateCodesService,
    private readonly openai: OpenAiJsonClient,
    private readonly instacartIdp: InstacartIdpClient,
    private readonly redisFactory: RedisClientFactory,
    private readonly config: ConfigService,
  ) {}

  async execute(input: GetInstacartRecipeLinkInput): Promise<{ url: string }> {
    const { objects, voterWaivPowers, rankVoteProjection } =
      await this.aggregatedObjectRepo.loadByObjectIds([input.objectId], {
        statuses: OBJECT_PAGE_VISIBLE_STATUSES,
      });
    const agg = objects[0];
    if (!agg) {
      throw new NotFoundException(`Object not found: ${input.objectId}`);
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      input.governanceObjectIdFromHeader,
    );
    const views = this.objectViewService.resolve(objects, voterWaivPowers, {
      update_types: [...INSTACART_UPDATE_TYPES],
      locale: input.locale,
      include_rejected: false,
      governance,
    });
    const view = views[0];
    if (!view) {
      throw new NotFoundException(`Object not found: ${input.objectId}`);
    }

    const projected = await this.objectProjectionService.project(view, {
      locale: input.locale,
      governanceObjectIdFromHeader: input.governanceObjectIdFromHeader,
      governance,
      rankVoteProjection,
    });

    if (projected.object_type !== OBJECT_TYPES.RECIPE) {
      throw new UnprocessableEntityException('Object is not a recipe');
    }
    if (!hasInstacartIdentifier(projected.fields)) {
      throw new UnprocessableEntityException('Object has no instacart identifier');
    }

    const configs = await this.affiliateCodes.getGovernanceConfigs(
      governance,
      input.governanceObjectIdFromHeader,
    );
    const affiliateCode = pickInstacartAffiliateCode(configs);
    const redis = this.redisFactory.getClient();

    try {
      return await createInstacartRecipeLink(projected, {
        instacartKey: this.config.get<string>('instacart.apiKey'),
        openaiKey: this.config.get<string>('openai.apiKey'),
        countryCode: input.countryCode,
        affiliateCode,
        fallbackOrigin:
          this.config.get<string>('siteCanonical.fallbackOrigin') ?? 'https://example.com',
        cacheGet: async (objectId) => redis.get(redisKey.instacartRecipeLink(objectId)),
        cacheSet: async (objectId, url, ttlSec) => {
          await redis.set(redisKey.instacartRecipeLink(objectId), url, ttlSec);
        },
        openai: this.openai,
        createRecipe: (payload) => this.instacartIdp.createRecipe(payload),
      });
    } catch (error) {
      if (error instanceof InstacartLinkRejectedError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
