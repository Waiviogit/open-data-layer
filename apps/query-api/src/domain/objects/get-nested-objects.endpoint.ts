import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, ObjectFavoriteRepository } from '../../repositories';
import { AffiliateLinksEnricher, flattenAffiliateTargets } from '../affiliate';
import { GovernanceResolverService } from '../governance';
import { expandObjectRefs } from '../object-projection/object-ref-expansion';
import { ListItemsRecursiveCountService } from '../object-projection/list-items-recursive-count.service';
import { collectObjectRefIdsFromView, projectObjectCore } from '../object-projection/project-object';
import { emptyRankVoteProjection } from '../object-projection/projected-object.types';
import {
  effectiveUpdateTypes,
  NESTED_OBJECT_UPDATE_TYPES,
} from './nested-object.constants';
import type {
  NestedObjectView,
  ResolveNestedObjectsResponse,
} from './schemas/resolve-nested-objects.schema';

export interface GetNestedObjectsInput {
  ids: string[];
  updateTypes?: string[];
  locale: string;
  governanceObjectIdFromHeader?: string;
  viewerAccount?: string;
  countryCode?: string | null;
}

@Injectable()
export class GetNestedObjectsEndpoint {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectFavoriteRepo: ObjectFavoriteRepository,
    private readonly listItemsRecursiveCountService: ListItemsRecursiveCountService,
    private readonly config: ConfigService,
    private readonly affiliateLinks: AffiliateLinksEnricher,
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
      update_types: effectiveUpdateTypes(input.updateTypes, NESTED_OBJECT_UPDATE_TYPES),
      locale: input.locale,
      include_rejected: false,
      governance,
    });

    const viewerAccount = input.viewerAccount?.trim() || undefined;
    const allRefIds = [...new Set(views.flatMap((v) => collectObjectRefIdsFromView(v)))];
    let viewerFavoriteIds: Set<string> | undefined;
    if (viewerAccount && allRefIds.length > 0) {
      const refFavoriteIds = await this.objectFavoriteRepo.findFavoriteObjectIdsForAccount(
        viewerAccount,
        allRefIds,
      );
      viewerFavoriteIds = new Set(refFavoriteIds);
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
        viewerFavoriteIds,
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

    await this.affiliateLinks.enrich(flattenAffiliateTargets(items), {
      countryCode: input.countryCode ?? null,
      governanceObjectIdFromHeader: input.governanceObjectIdFromHeader,
      governance,
    });

    return { items };
  }
}
