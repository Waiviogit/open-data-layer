import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, ObjectAuthorityRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { expandObjectRefs } from '../object-projection/object-ref-expansion';
import { ListItemsRecursiveCountService } from '../object-projection/list-items-recursive-count.service';
import { collectObjectRefIdsFromView, projectObjectCore } from '../object-projection/project-object';
import { emptyRankVoteProjection } from '../object-projection/projected-object.types';
import type {
  NestedObjectView,
  ResolveNestedObjectsResponse,
} from './schemas/resolve-nested-objects.schema';

/** Update types needed for nested catalog navigation (list items, sort, page body). */
const NESTED_OBJECT_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.LIST_ITEM,
  UPDATE_TYPES.SORT_CUSTOM,
  UPDATE_TYPES.PAGE_CONTENT,
  UPDATE_TYPES.NAME,
];

export interface GetNestedObjectsInput {
  ids: string[];
  locale: string;
  governanceObjectIdFromHeader?: string;
  viewerAccount?: string;
}

@Injectable()
export class GetNestedObjectsEndpoint {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectAuthorityRepo: ObjectAuthorityRepository,
    private readonly listItemsRecursiveCountService: ListItemsRecursiveCountService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: GetNestedObjectsInput): Promise<ResolveNestedObjectsResponse> {
    const uniqueIds = [...new Set(input.ids.map((id) => id.trim()).filter((id) => id.length > 0))];
    if (uniqueIds.length === 0) {
      return { items: [] };
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      input.governanceObjectIdFromHeader,
    );

    const { objects, voterWaivPowers } = await this.aggregatedObjectRepo.loadByObjectIds(uniqueIds, {
      viewerAccount: input.viewerAccount,
      includeRankVoteProjection: false,
    });

    const views = this.objectViewService.resolve(objects, voterWaivPowers, {
      update_types: [...NESTED_OBJECT_UPDATE_TYPES],
      locale: input.locale,
      include_rejected: false,
      governance,
    });

    const viewerAccount = input.viewerAccount?.trim() || undefined;
    const allRefIds = [...new Set(views.flatMap((v) => collectObjectRefIdsFromView(v)))];
    let viewerAdminIds: Set<string> | undefined;
    if (viewerAccount && allRefIds.length > 0) {
      const refAdminIds = await this.objectAuthorityRepo.findAdministrativeObjectIdsForAccount(
        viewerAccount,
        allRefIds,
      );
      viewerAdminIds = new Set(refAdminIds);
    }

    const contentBaseUrl = this.config.get<string | undefined>('ipfs.contentBaseUrl');
    const byId = new Map<string, NestedObjectView>();

    for (const view of views) {
      const refIds = collectObjectRefIdsFromView(view);
      const refSummariesById = await expandObjectRefs(refIds, {
        aggregatedObjectRepo: this.aggregatedObjectRepo,
        objectViewService: this.objectViewService,
        listItemsRecursiveCountService: this.listItemsRecursiveCountService,
        parentObjectId: view.object_id,
        governance,
        locale: input.locale,
        contentBaseUrl,
        viewerAccount,
        viewerAdminIds,
      });

      const projected = projectObjectCore({
        view,
        contentBaseUrl,
        refSummariesById,
        viewerAccount,
        rankVoteProjection: emptyRankVoteProjection(),
      });

      byId.set(view.object_id, {
        object_id: projected.object_id,
        object_type: projected.object_type,
        fields: projected.fields,
      });
    }

    const items: NestedObjectView[] = [];
    for (const id of input.ids) {
      const trimmed = id.trim();
      const entry = byId.get(trimmed);
      if (entry) {
        items.push(entry);
      }
    }

    return { items };
  }
}
