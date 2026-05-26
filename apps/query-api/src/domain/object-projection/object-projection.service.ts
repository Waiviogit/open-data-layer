import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GovernanceSnapshot } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, ObjectAuthorityRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { expandObjectRefs } from './object-ref-expansion';
import { ListItemsRecursiveCountService } from './list-items-recursive-count.service';
import { normalizeProjectedObjectForJson } from './normalize-projected-object-for-json';
import { collectObjectRefIdsFromView, projectObjectCore } from './project-object';
import { ObjectSeoService } from './object-seo.service';
import type { ProjectedObject, RankVoteProjection } from './projected-object.types';

export interface ProjectOptions {
  locale: string;
  /** When true, adds `seo` via {@link ObjectSeoService}. Default false. */
  includeSeo?: boolean;
  /** Optional `X-Governance-Object-Id` merge for governance resolution. */
  governanceObjectIdFromHeader?: string;
  /** Pre-resolved governance snapshot; skips duplicate resolve when provided. */
  governance?: GovernanceSnapshot;
  /**
   * Current viewer (e.g. from `X-Viewer`). Used for `hasAdministrativeAuthority`, `hasOwnershipAuthority`,
   * and `aggregateRating` per-aspect `userRating`.
   */
  viewerAccount?: string;
  /**
   * Vote counts / viewer ranks for `aggregateRating` from {@link AggregatedObjectRepository.loadByObjectIds}.
   */
  rankVoteProjection: RankVoteProjection;
}

export interface BatchProjectOptions {
  locale: string;
  /** When true, adds `seo` per item via {@link ObjectSeoService}. Default false. */
  includeSeo?: boolean;
  governanceObjectIdFromHeader?: string;
  governance?: GovernanceSnapshot;
  viewerAccount?: string;
  /** Same batch as the views (from one `loadByObjectIds`). */
  rankVoteProjection: RankVoteProjection;
}

@Injectable()
export class ObjectProjectionService {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectAuthorityRepo: ObjectAuthorityRepository,
    private readonly listItemsRecursiveCountService: ListItemsRecursiveCountService,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly seoService: ObjectSeoService,
    private readonly config: ConfigService,
  ) {}

  async project(view: ResolvedObjectView, options: ProjectOptions): Promise<ProjectedObject> {
    const ipfsGatewayBaseUrl = this.config.get<string>('ipfs.gatewayUrl') ?? 'https://ipfs.io';
    const viewerAccount = options.viewerAccount?.trim() || undefined;
    const governance =
      options.governance ??
      (await this.governanceResolver.resolveMergedForObjectView(
        options.governanceObjectIdFromHeader,
      ));

    let hasAdministrativeAuthority = false;
    let hasOwnershipAuthority = false;
    let viewerAdminIds: Set<string> | undefined;
    if (viewerAccount) {
      const [adminIds, ownershipIds] = await Promise.all([
        this.objectAuthorityRepo.findAdministrativeObjectIdsForAccount(viewerAccount, [view.object_id]),
        this.objectAuthorityRepo.findOwnershipObjectIdsForAccount(viewerAccount, [view.object_id]),
      ]);
      hasAdministrativeAuthority = adminIds.includes(view.object_id);
      hasOwnershipAuthority = ownershipIds.includes(view.object_id);
      viewerAdminIds = new Set(adminIds);
    }

    const refIds = collectObjectRefIdsFromView(view);
    if (viewerAccount && refIds.length > 0) {
      const refAdminIds = await this.objectAuthorityRepo.findAdministrativeObjectIdsForAccount(
        viewerAccount,
        refIds,
      );
      viewerAdminIds = new Set([...(viewerAdminIds ?? []), ...refAdminIds]);
    }

    const refSummariesById = await expandObjectRefs(refIds, {
      aggregatedObjectRepo: this.aggregatedObjectRepo,
      objectViewService: this.objectViewService,
      listItemsRecursiveCountService: this.listItemsRecursiveCountService,
      parentObjectId: view.object_id,
      governance,
      locale: options.locale,
      ipfsGatewayBaseUrl,
      viewerAccount,
      viewerAdminIds,
    });

    const projectedCore = projectObjectCore({
      view,
      ipfsGatewayBaseUrl,
      refSummariesById,
      viewerAccount,
      rankVoteProjection: options.rankVoteProjection,
    });

    const projected: ProjectedObject = {
      ...projectedCore,
      hasAdministrativeAuthority,
      hasOwnershipAuthority,
    };

    if (options.includeSeo === true) {
      return normalizeProjectedObjectForJson({
        ...projected,
        seo: this.seoService.build(projected, view.canonical ?? null),
      });
    }

    return normalizeProjectedObjectForJson(projected);
  }

  /**
   * Projects multiple views with one batched administrative/ownership lookup.
   * Order of the returned array matches the order of `views`.
   */
  async batchProject(views: ResolvedObjectView[], options: BatchProjectOptions): Promise<ProjectedObject[]> {
    if (views.length === 0) {
      return [];
    }

    const ipfsGatewayBaseUrl = this.config.get<string>('ipfs.gatewayUrl') ?? 'https://ipfs.io';
    const viewerAccount = options.viewerAccount?.trim() || undefined;
    const governance =
      options.governance ??
      (await this.governanceResolver.resolveMergedForObjectView(
        options.governanceObjectIdFromHeader,
      ));

    const objectIds = views.map((v) => v.object_id);
    let adminSet = new Set<string>();
    let ownershipSet = new Set<string>();
    let viewerAdminIds: Set<string> | undefined;
    if (viewerAccount) {
      const [adminIds, ownershipIds] = await Promise.all([
        this.objectAuthorityRepo.findAdministrativeObjectIdsForAccount(viewerAccount, objectIds),
        this.objectAuthorityRepo.findOwnershipObjectIdsForAccount(viewerAccount, objectIds),
      ]);
      adminSet = new Set(adminIds);
      ownershipSet = new Set(ownershipIds);
      viewerAdminIds = new Set(adminIds);
    }

    const allRefIds = [...new Set(views.flatMap((v) => collectObjectRefIdsFromView(v)))];
    if (viewerAccount && allRefIds.length > 0) {
      const refAdminIds = await this.objectAuthorityRepo.findAdministrativeObjectIdsForAccount(
        viewerAccount,
        allRefIds,
      );
      viewerAdminIds = new Set([...(viewerAdminIds ?? []), ...refAdminIds]);
    }

    const rankVp = options.rankVoteProjection;
    const results: ProjectedObject[] = [];
    for (const view of views) {
      const refIds = collectObjectRefIdsFromView(view);
      const refSummariesById = await expandObjectRefs(refIds, {
        aggregatedObjectRepo: this.aggregatedObjectRepo,
        objectViewService: this.objectViewService,
        listItemsRecursiveCountService: this.listItemsRecursiveCountService,
        parentObjectId: view.object_id,
        governance,
        locale: options.locale,
        ipfsGatewayBaseUrl,
        viewerAccount,
        viewerAdminIds,
      });

      const projectedCore = projectObjectCore({
        view,
        ipfsGatewayBaseUrl,
        refSummariesById,
        viewerAccount,
        rankVoteProjection: rankVp,
      });

      let projected: ProjectedObject = {
        ...projectedCore,
        hasAdministrativeAuthority: adminSet.has(view.object_id),
        hasOwnershipAuthority: ownershipSet.has(view.object_id),
      };

      if (options.includeSeo === true) {
        projected = {
          ...projected,
          seo: this.seoService.build(projected, view.canonical ?? null),
        };
      }

      results.push(normalizeProjectedObjectForJson(projected));
    }

    return results;
  }
}
