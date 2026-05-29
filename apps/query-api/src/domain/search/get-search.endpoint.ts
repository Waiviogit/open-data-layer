import { Injectable } from '@nestjs/common';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { AggregatedObjectRepository, SearchRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { ObjectProjectionService } from '../object-projection/object-projection.service';
import type { ProjectedObject, RefSummary } from '../object-projection/projected-object.types';
import type {
  SearchObjectResult,
  SearchResponseDto,
  SearchUserResult,
} from './search.types';

const SEARCH_UPDATE_TYPES = [UPDATE_TYPES.NAME, UPDATE_TYPES.IMAGE, UPDATE_TYPES.PARENT] as const;

/** Max user hits returned alongside object hits (profile list). */
const USER_SEARCH_LIMIT = 5;

export type SearchResultType = 'all' | 'objects' | 'users';

export interface GetSearchInput {
  q: string;
  locale: string;
  limit: number;
  type: SearchResultType;
  /** Optional `X-Viewer` for projection + follow status. */
  viewerAccount?: string;
  /** Optional `X-Governance-Object-Id` for governance merge in resolution/projection. */
  governanceObjectIdFromHeader?: string;
}

function parentDisplayName(parent: unknown): string | null {
  if (!parent || typeof parent !== 'object') {
    return null;
  }
  const ref = parent as RefSummary;
  const raw = ref.fields?.[UPDATE_TYPES.NAME];
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}

function mapProjectedToSearchObject(p: ProjectedObject): SearchObjectResult {
  const nameVal = p.fields[UPDATE_TYPES.NAME];
  const imageVal = p.fields[UPDATE_TYPES.IMAGE];
  const parentVal = p.fields[UPDATE_TYPES.PARENT];
  return {
    object_id: p.object_id,
    object_type: p.object_type,
    name: typeof nameVal === 'string' ? nameVal : null,
    image_url: typeof imageVal === 'string' ? imageVal : null,
    parent_name: parentDisplayName(parentVal),
  };
}

@Injectable()
export class GetSearchEndpoint {
  constructor(
    private readonly searchRepo: SearchRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectProjectionService: ObjectProjectionService,
  ) {}

  async execute(input: GetSearchInput): Promise<SearchResponseDto> {
    const objectLimit = input.limit;
    const includeObjects = input.type !== 'users';
    const includeUsers = input.type !== 'objects';

    const [candidates, userRows] = await Promise.all([
      includeObjects
        ? this.searchRepo.searchObjects(input.q, objectLimit)
        : Promise.resolve([]),
      includeUsers
        ? this.searchRepo.searchUsers(input.q, USER_SEARCH_LIMIT, input.viewerAccount)
        : Promise.resolve([]),
    ]);

    const objectIds = candidates.map((c) => c.object_id);

    const objectsOut: SearchObjectResult[] = [];

    if (objectIds.length > 0) {
      const { objects, voterWaivPowers, rankVoteProjection } =
        await this.aggregatedObjectRepo.loadByObjectIds(objectIds, {
          viewerAccount: input.viewerAccount,
          includeRankVoteProjection: false,
        });

      const byId = new Map(objects.map((o) => [o.core.object_id, o]));
      const ordered = objectIds.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => x != null);

      const governance = await this.governanceResolver.resolveMergedForObjectView(
        input.governanceObjectIdFromHeader,
      );

      const views = this.objectViewService.resolve(ordered, voterWaivPowers, {
        update_types: [...SEARCH_UPDATE_TYPES],
        locale: input.locale,
        include_rejected: false,
        governance,
      });

      const projected = await this.objectProjectionService.batchProject(views, {
        locale: input.locale,
        includeSeo: false,
        governanceObjectIdFromHeader: input.governanceObjectIdFromHeader,
        viewerAccount: input.viewerAccount,
        rankVoteProjection: rankVoteProjection,
      });

      for (const p of projected) {
        objectsOut.push(mapProjectedToSearchObject(p));
      }
    }

    const users: SearchUserResult[] = userRows.map(
      (r): SearchUserResult => ({
        name: r.name,
        profile_image: r.profile_image,
        reputation: r.object_reputation,
        followers_count: r.followers_count,
        is_following: r.is_following,
      }),
    );

    return {
      objects: objectsOut,
      users,
    };
  }
}
