import { Controller, Get, Query } from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import {
  GetSearchEndpoint,
  searchQuerySchema,
  type SearchQuery,
  type SearchResponseDto,
} from '../domain/search';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodQueryPipe } from '../pipes';

@Controller({ path: 'search', version: ['1', '2'] })
export class SearchController {
  constructor(private readonly getSearch: GetSearchEndpoint) {}

  @Get()
  async search(
    @Query(new ZodQueryPipe(searchQuerySchema)) query: SearchQuery,
    @ReqLocale() locale: string,
    @ReqViewer() viewer: string | undefined,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
  ): Promise<SearchResponseDto> {
    return this.getSearch.execute({
      q: query.q,
      locale,
      limit: query.limit,
      viewerAccount: viewer,
      governanceObjectIdFromHeader,
    });
  }
}
