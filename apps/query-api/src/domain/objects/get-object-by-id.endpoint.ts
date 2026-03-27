import { Injectable } from '@nestjs/common';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';

export interface GetObjectByIdInput {
  objectId: string;
  updateTypes: string[];
  locale: string;
  includeRejected?: boolean;
}

@Injectable()
export class GetObjectByIdEndpoint {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
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

    const views = this.objectViewService.resolve(objects, voterReputations, {
      update_types: updateTypes,
      locale: input.locale,
      include_rejected: input.includeRejected ?? false,
    });

    return views[0] ?? null;
  }
}
