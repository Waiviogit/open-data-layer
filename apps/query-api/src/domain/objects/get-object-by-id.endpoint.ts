import { Injectable } from '@nestjs/common';
import { OBJECT_PAGE_VISIBLE_STATUSES, UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectFavoriteRepository,
  ObjectOwnershipRepository,
  ObjectUpdatesRepository,
  PostsRepository,
  UserObjectFollowsRepository,
  UserObjectExpertiseRepository,
} from '../../repositories';
import { AffiliateLinksEnricher, flattenAffiliateTargets } from '../affiliate';
import { GovernanceResolverService } from '../governance';
import { ObjectProjectionService } from '../object-projection/object-projection.service';
import type { ProjectedObjectWithCounts } from './projected-object-with-counts.types';

export interface GetObjectByIdInput {
  objectId: string;
  updateTypes: string[];
  locale: string;
  includeRejected?: boolean;
  /** Optional `X-Governance-Object-Id` value; merged with config governance when set. */
  governanceObjectIdFromHeader?: string;
  /** Optional `X-Viewer` Hive account for projection favorite / ownership / rating context. */
  viewerAccount?: string;
  countryCode?: string | null;
}

@Injectable()
export class GetObjectByIdEndpoint {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectProjectionService: ObjectProjectionService,
    private readonly userObjectFollowsRepo: UserObjectFollowsRepository,
    private readonly userObjectExpertiseRepo: UserObjectExpertiseRepository,
    private readonly objectUpdatesRepo: ObjectUpdatesRepository,
    private readonly objectFavoriteRepo: ObjectFavoriteRepository,
    private readonly objectOwnershipRepo: ObjectOwnershipRepository,
    private readonly postsRepo: PostsRepository,
    private readonly affiliateLinks: AffiliateLinksEnricher,
  ) {}

  async execute(input: GetObjectByIdInput): Promise<ProjectedObjectWithCounts | null> {
    const { objects, voterWaivPowers, rankVoteProjection } = await this.aggregatedObjectRepo.loadByObjectIds(
      [input.objectId],
      {
        viewerAccount: input.viewerAccount,
        statuses: OBJECT_PAGE_VISIBLE_STATUSES,
      },
    );
    const agg = objects[0];
    if (!agg) {
      return null;
    }

    const requested =
      input.updateTypes.length > 0
        ? input.updateTypes
        : [...new Set(agg.updates.map((u) => u.update_type))];
    const updateTypes = requested.includes(UPDATE_TYPES.IDENTIFIER)
      ? requested
      : [...requested, UPDATE_TYPES.IDENTIFIER];

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      input.governanceObjectIdFromHeader,
    );

    const views = this.objectViewService.resolve(objects, voterWaivPowers, {
      update_types: updateTypes,
      locale: input.locale,
      include_rejected: input.includeRejected ?? false,
      governance,
    });

    const view = views[0];
    if (!view) {
      return null;
    }

    const objectId = view.object_id;

    const [
      projected,
      update_type_counts,
      update_locales,
      followers_count,
      experts_count,
      posts_count,
      favorited_by_count,
      supervised_count,
      exclusive_count,
      viewerFollow,
    ] = await Promise.all([
      this.objectProjectionService.project(view, {
        locale: input.locale,
        governanceObjectIdFromHeader: input.governanceObjectIdFromHeader,
        governance,
        viewerAccount: input.viewerAccount,
        rankVoteProjection,
        includeSeo: true,
      }),
      this.objectUpdatesRepo.countByObjectIdGroupByUpdateType(objectId),
      this.objectUpdatesRepo.findDistinctLocalesByObjectId(objectId),
      this.userObjectFollowsRepo.countByObjectId(objectId),
      this.userObjectExpertiseRepo.countByObjectId(objectId),
      this.postsRepo.countPostObjectsByObjectId(objectId),
      this.objectFavoriteRepo.countByObjectId(objectId),
      this.objectOwnershipRepo.countByObjectIdAndType(objectId, 'supervised'),
      this.objectOwnershipRepo.countByObjectIdAndType(objectId, 'exclusive'),
      input.viewerAccount
        ? this.userObjectFollowsRepo.findByAccountAndObject(input.viewerAccount, objectId)
        : Promise.resolve(null),
    ]);

    const updates_count = Object.values(update_type_counts).reduce((sum, n) => sum + n, 0);

    await this.affiliateLinks.enrich(flattenAffiliateTargets([projected]), {
      countryCode: input.countryCode ?? null,
      governanceObjectIdFromHeader: input.governanceObjectIdFromHeader,
      governance,
    });

    return {
      ...projected,
      followers_count,
      experts_count,
      posts_count,
      updates_count,
      favorited_by_count,
      supervised_count,
      exclusive_count,
      is_following: viewerFollow != null,
      viewer_bell: viewerFollow?.bell ?? false,
      update_type_counts,
      update_locales,
    };
  }
}
