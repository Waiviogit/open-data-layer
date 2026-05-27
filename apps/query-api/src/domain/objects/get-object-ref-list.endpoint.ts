import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectAuthorityRepository,
  ObjectRefListRepository,
  ObjectsCoreRepository,
} from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { expandObjectRefs } from '../object-projection/object-ref-expansion';
import { ListItemsRecursiveCountService } from '../object-projection/list-items-recursive-count.service';
import type { RefSummary } from '../object-projection/projected-object.types';
import { resolveObjectRefIds } from './resolve-object-ref-ids';
import type {
  ObjectRefListQuery,
  ObjectRefListResponseDto,
} from './schemas/object-ref-list.schema';

export type ObjectRefListUpdateType =
  | typeof UPDATE_TYPES.IS_RELATED_TO
  | typeof UPDATE_TYPES.IS_SIMILAR_TO
  | typeof UPDATE_TYPES.ADD_ON;

function collectRefIdsFromUpdateType(view: ResolvedObjectView, updateType: string): string[] {
  const field = view.fields[updateType];
  if (!field) {
    return [];
  }
  const ids: string[] = [];
  for (const u of field.values) {
    if (u.validity_status !== 'VALID') {
      continue;
    }
    const id = u.value_text?.trim();
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

@Injectable()
export class GetObjectRefListEndpoint {
  constructor(
    private readonly objectsCore: ObjectsCoreRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectAuthorityRepo: ObjectAuthorityRepository,
    private readonly listItemsRecursiveCountService: ListItemsRecursiveCountService,
    private readonly objectRefListRepo: ObjectRefListRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(
    objectId: string,
    updateType: ObjectRefListUpdateType,
    query: ObjectRefListQuery,
    locale: string,
    governanceObjectIdFromHeader?: string,
    viewerAccount?: string,
  ): Promise<ObjectRefListResponseDto | null> {
    const id = objectId.trim();
    if (id.length === 0) {
      return null;
    }

    const core = await this.objectsCore.findByObjectId(id);
    if (!core) {
      return null;
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      governanceObjectIdFromHeader,
    );

    const { objects, voterWaivPowers } = await this.aggregatedObjectRepo.loadByObjectIds([id], {
      viewerAccount,
      includeRankVoteProjection: false,
    });
    const agg = objects[0];
    if (!agg) {
      return null;
    }

    const views = this.objectViewService.resolve(objects, voterWaivPowers, {
      update_types: [updateType],
      locale,
      include_rejected: false,
      governance,
    });
    const view = views[0];
    if (!view) {
      return null;
    }

    const explicitRefIds = collectRefIdsFromUpdateType(view, updateType);
    const skip = Number.parseInt(query.cursor?.trim() ?? '0', 10);
    const safeSkip = Number.isFinite(skip) && skip >= 0 ? skip : 0;

    const { pageIds, hasMore, nextCursor } = await resolveObjectRefIds({
      sourceId: id,
      updateType,
      explicitRefIds,
      skip: safeSkip,
      limit: query.limit,
      repo: this.objectRefListRepo,
    });

    if (pageIds.length === 0) {
      return { items: [], hasMore: false, cursor: null };
    }

    const viewer = viewerAccount?.trim() || undefined;
    let viewerAdminIds: Set<string> | undefined;
    if (viewer) {
      const refAdminIds = await this.objectAuthorityRepo.findAdministrativeObjectIdsForAccount(
        viewer,
        pageIds,
      );
      viewerAdminIds = new Set(refAdminIds);
    }

    const ipfsGatewayBaseUrl = this.config.get<string>('ipfs.gatewayUrl') ?? 'https://ipfs.io';
    const refSummariesById = await expandObjectRefs(pageIds, {
      aggregatedObjectRepo: this.aggregatedObjectRepo,
      objectViewService: this.objectViewService,
      listItemsRecursiveCountService: this.listItemsRecursiveCountService,
      parentObjectId: id,
      governance,
      locale,
      ipfsGatewayBaseUrl,
      viewerAccount: viewer,
      viewerAdminIds,
    });

    const items: RefSummary[] = [];
    for (const refId of pageIds) {
      const summary = refSummariesById.get(refId);
      if (summary) {
        items.push(summary);
      }
    }

    return { items, hasMore, cursor: nextCursor };
  }
}
