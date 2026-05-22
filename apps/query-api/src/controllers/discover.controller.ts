import { Controller, Get, Query } from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import {
  GetDiscoverObjectsEndpoint,
  GetDiscoverTagCategoriesEndpoint,
  GetDiscoverUsersEndpoint,
  discoverObjectsQuerySchema,
  discoverTagCategoriesQuerySchema,
  discoverUsersQuerySchema,
  type DiscoverObjectsQuery,
  type DiscoverObjectsResponseDto,
  type DiscoverTagCategoriesQuery,
  type DiscoverTagCategoriesResponseDto,
  type DiscoverUsersQuery,
  type DiscoverUsersResponseDto,
} from '../domain/discover';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodQueryPipe } from '../pipes';

@Controller({ path: 'discover', version: ['1', '2'] })
export class DiscoverController {
  constructor(
    private readonly getDiscoverObjects: GetDiscoverObjectsEndpoint,
    private readonly getDiscoverUsers: GetDiscoverUsersEndpoint,
    private readonly getDiscoverTagCategories: GetDiscoverTagCategoriesEndpoint,
  ) {}

  @Get('objects')
  async objects(
    @Query(new ZodQueryPipe(discoverObjectsQuerySchema)) query: DiscoverObjectsQuery,
    @ReqLocale() locale: string,
    @ReqViewer() viewer: string | undefined,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
  ): Promise<DiscoverObjectsResponseDto> {
    return this.getDiscoverObjects.execute({
      query,
      locale,
      viewerAccount: viewer,
      governanceObjectIdFromHeader,
    });
  }

  @Get('users')
  async users(
    @Query(new ZodQueryPipe(discoverUsersQuerySchema)) query: DiscoverUsersQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<DiscoverUsersResponseDto> {
    return this.getDiscoverUsers.execute({ query, viewerAccount: viewer });
  }

  @Get('tag-categories')
  async tagCategories(
    @Query(new ZodQueryPipe(discoverTagCategoriesQuerySchema)) query: DiscoverTagCategoriesQuery,
  ): Promise<DiscoverTagCategoriesResponseDto> {
    return this.getDiscoverTagCategories.execute({ query });
  }
}
