import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, ObjectAuthorityRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { expandObjectRefs } from './object-ref-expansion';
import { collectObjectRefIdsFromView, projectObjectCore } from './project-object';
import { ObjectSeoService } from './object-seo.service';
import type { ProjectedObject } from './projected-object.types';

export interface ProjectOptions {
  locale: string;
  /** When true, adds `seo` via {@link ObjectSeoService}. Default false. */
  includeSeo?: boolean;
  /** Optional `X-Governance-Object-Id` merge for governance resolution. */
  governanceObjectIdFromHeader?: string;
  /**
   * Current viewer (e.g. from `X-Viewer`). Used for `hasAdministrativeAuthority`, `hasOwnershipAuthority`,
   * and `aggregateRating.userRating`.
   */
  viewerAccount?: string;
}

@Injectable()
export class ObjectProjectionService {
  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectAuthorityRepo: ObjectAuthorityRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly seoService: ObjectSeoService,
    private readonly config: ConfigService,
  ) {}

  async project(view: ResolvedObjectView, options: ProjectOptions): Promise<ProjectedObject> {
    const ipfsGatewayBaseUrl = this.config.get<string>('ipfs.gatewayUrl') ?? 'https://ipfs.io';
    const viewerAccount = options.viewerAccount?.trim() || undefined;
    const governance = await this.governanceResolver.resolveMergedForObjectView(
      options.governanceObjectIdFromHeader,
    );

    let hasAdministrativeAuthority = false;
    let hasOwnershipAuthority = false;
    if (viewerAccount) {
      const [adminIds, ownershipIds] = await Promise.all([
        this.objectAuthorityRepo.findAdministrativeObjectIdsForAccount(viewerAccount, [view.object_id]),
        this.objectAuthorityRepo.findOwnershipObjectIdsForAccount(viewerAccount, [view.object_id]),
      ]);
      hasAdministrativeAuthority = adminIds.includes(view.object_id);
      hasOwnershipAuthority = ownershipIds.includes(view.object_id);
    }

    const refIds = collectObjectRefIdsFromView(view);
    const refSummariesById = await expandObjectRefs(refIds, {
      aggregatedObjectRepo: this.aggregatedObjectRepo,
      objectViewService: this.objectViewService,
      governance,
      locale: options.locale,
      ipfsGatewayBaseUrl,
      viewerAccount,
    });

    const core = projectObjectCore({
      view,
      ipfsGatewayBaseUrl,
      refSummariesById,
      viewerAccount,
    });

    const projected: ProjectedObject = {
      ...core,
      hasAdministrativeAuthority,
      hasOwnershipAuthority,
    };

    if (options.includeSeo === true) {
      return { ...projected, seo: this.seoService.build(projected) };
    }

    return projected;
  }
}
