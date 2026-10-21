import { Controller, Get, Query } from '@nestjs/common';
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
import { CountryResolverService } from '../domain/geoip';
import { ReqClientIp } from '../http/client-ip.decorator';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqLocale } from '../http/locale-header.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodQueryPipe } from '../pipes';

@Controller({ path: 'discover', version: ['1', '2'] })
export class DiscoverController {
  constructor(
    private readonly getDiscoverObjects: GetDiscoverObjectsEndpoint,
    private readonly getDiscoverUsers: GetDiscoverUsersEndpoint,
    private readonly getDiscoverTagCategories: GetDiscoverTagCategoriesEndpoint,
    private readonly countryResolver: CountryResolverService,
  ) {}

  @Get('objects')
  async objects(
    @Query(new ZodQueryPipe(discoverObjectsQuerySchema)) query: DiscoverObjectsQuery,
    @ReqLocale() locale: string,
    @ReqViewer() viewer: string | undefined,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqClientIp() clientIp: string | null,
  ): Promise<DiscoverObjectsResponseDto> {
    return this.getDiscoverObjects.execute({
      query,
      locale,
      viewerAccount: viewer,
      governanceObjectIdFromHeader,
      countryCode: this.countryResolver.resolve(clientIp, query.country),
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
