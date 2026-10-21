import { Controller, Get, Query } from '@nestjs/common';
import {
  categoryObjectsQuerySchema,
  GetCategoryObjectsEndpoint,
  type CategoryObjectsQuery,
} from '../domain/categories';
import type { ObjectRefListResponseDto } from '../domain/objects/schemas/object-ref-list.schema';
import { CountryResolverService } from '../domain/geoip';
import { ReqClientIp } from '../http/client-ip.decorator';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqLocale } from '../http/locale-header.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodQueryPipe } from '../pipes';

@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(
    private readonly getCategoryObjects: GetCategoryObjectsEndpoint,
    private readonly countryResolver: CountryResolverService,
  ) {}

  @Get('objects')
  async getObjects(
    @Query(new ZodQueryPipe(categoryObjectsQuerySchema)) query: CategoryObjectsQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
    @ReqClientIp() clientIp: string | null,
  ): Promise<ObjectRefListResponseDto> {
    return this.getCategoryObjects.execute({
      query,
      locale,
      governanceObjectIdFromHeader,
      viewerAccount: viewer,
      countryCode: this.countryResolver.resolve(clientIp, query.country),
    });
  }
}
