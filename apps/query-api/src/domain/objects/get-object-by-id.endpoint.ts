import { Injectable } from '@nestjs/common';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectAuthorityRepository,
  ObjectUpdatesRepository,
  UserObjectFollowsRepository,
} from '../../repositories';
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
  /** Optional `X-Viewer` Hive account for projection authority / rating context. */
  viewerAccount?: string;
}

@Injectable()
export class GetObjectByIdEndpoint {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectProjectionService: ObjectProjectionService,
    private readonly userObjectFollowsRepo: UserObjectFollowsRepository,
    private readonly objectUpdatesRepo: ObjectUpdatesRepository,
    private readonly objectAuthorityRepo: ObjectAuthorityRepository,
  ) {}

  async execute(input: GetObjectByIdInput): Promise<ProjectedObjectWithCounts | null> {
    const { objects, voterWaivPowers, rankVoteProjection } = await this.aggregatedObjectRepo.loadByObjectIds(
      [input.objectId],
      { viewerAccount: input.viewerAccount },
    );
    const agg = objects[0];
    if (!agg) {
      return null;
    }

    const updateTypes =
      input.updateTypes.length > 0
        ? input.updateTypes
        : [...new Set(agg.updates.map((u) => u.update_type))];

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

    const [projected, followers_count, updates_count, administrative_count, ownership_count] =
      await Promise.all([
        this.objectProjectionService.project(view, {
          locale: input.locale,
          governanceObjectIdFromHeader: input.governanceObjectIdFromHeader,
          viewerAccount: input.viewerAccount,
          rankVoteProjection,
        }),
        this.userObjectFollowsRepo.countByObjectId(objectId),
        this.objectUpdatesRepo.countByObjectId(objectId),
        this.objectAuthorityRepo.countByObjectIdAndType(objectId, 'administrative'),
        this.objectAuthorityRepo.countByObjectIdAndType(objectId, 'ownership'),
      ]);

    return {
      ...projected,
      followers_count,
      updates_count,
      administrative_count,
      ownership_count,
    };
  }
}
