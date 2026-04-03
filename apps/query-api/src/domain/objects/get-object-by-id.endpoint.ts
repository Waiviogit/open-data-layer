import { Injectable } from '@nestjs/common';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';

export interface GetObjectByIdInput {
  objectId: string;
  updateTypes: string[];
  locale: string;
  includeRejected?: boolean;
  /** Optional `X-Governance-Object-Id` value; merged with config governance when set. */
  governanceObjectIdFromHeader?: string;
}

@Injectable()
export class GetObjectByIdEndpoint {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
  ) {}

  async execute(input: GetObjectByIdInput): Promise<ResolvedObjectView | null> {
    const { objects, voterReputations } = await this.aggregatedObjectRepo.loadByObjectIds([
      input.objectId,
    ]);
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

    const views = this.objectViewService.resolve(objects, voterReputations, {
      update_types: updateTypes,
      locale: input.locale,
      include_rejected: input.includeRejected ?? false,
      governance,
    });

    return views[0] ?? null;
  }
}
