import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Param,
} from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import {
  GetObjectByIdEndpoint,
  GetNestedObjectsEndpoint,
  GetObjectFollowersEndpoint,
  GetObjectAuthorityEndpoint,
  resolveObjectBodySchema,
  resolveNestedObjectsBodySchema,
  type ProjectedObjectWithCounts,
  type ResolveObjectBody,
  type ResolveNestedObjectsBody,
  type ResolveNestedObjectsResponse,
} from '../domain/objects';
import {
  userSocialListQuerySchema,
  objectAuthorityQuerySchema,
  type PaginatedUserFollowList,
  type UserSocialListQuery,
  type ObjectAuthorityQuery,
} from '../domain/social';
import {
  GetObjectUpdatesFeedEndpoint,
  objectUpdatesFeedQuerySchema,
  type ObjectUpdatesFeedQuery,
  type ObjectUpdatesFeedResponseDto,
} from '../domain/object-updates';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodBodyPipe, ZodQueryPipe } from '../pipes';

@Controller({ path: 'objects', version: ['1', '2'] })
export class ObjectsController {
  constructor(
    private readonly getObjectById: GetObjectByIdEndpoint,
    private readonly getNestedObjects: GetNestedObjectsEndpoint,
    private readonly getObjectUpdatesFeed: GetObjectUpdatesFeedEndpoint,
    private readonly getObjectFollowersEndpoint: GetObjectFollowersEndpoint,
    private readonly getObjectAuthorityEndpoint: GetObjectAuthorityEndpoint,
  ) {}

  @Get(':objectId/authority')
  async getObjectAuthorityList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectAuthorityQuerySchema)) query: ObjectAuthorityQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedUserFollowList> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectAuthorityEndpoint.execute(decodedId, query, viewer);
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/followers')
  async getObjectFollowersList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(userSocialListQuerySchema)) query: UserSocialListQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedUserFollowList> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectFollowersEndpoint.execute(decodedId, query, viewer);
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/updates')
  async getUpdatesFeed(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectUpdatesFeedQuerySchema)) query: ObjectUpdatesFeedQuery,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectUpdatesFeedResponseDto> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectUpdatesFeed.execute({
      objectId: decodedId,
      query,
      governanceObjectIdFromHeader,
      viewerAccount: viewer,
    });
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Post('resolve')
  async resolve(
    @Body(new ZodBodyPipe(resolveObjectBodySchema)) body: ResolveObjectBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ProjectedObjectWithCounts> {
    const view = await this.getObjectById.execute({
      objectId: body.object_id,
      updateTypes: body.update_types,
      locale,
      includeRejected: body.include_rejected,
      governanceObjectIdFromHeader,
      viewerAccount: viewer,
    });
    if (!view) {
      throw new NotFoundException(`Object not found: ${body.object_id}`);
    }
    return view;
  }

  @Post('resolve-nested')
  async resolveNested(
    @Body(new ZodBodyPipe(resolveNestedObjectsBodySchema)) body: ResolveNestedObjectsBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ResolveNestedObjectsResponse> {
    return this.getNestedObjects.execute({
      ids: body.ids,
      locale,
      governanceObjectIdFromHeader,
      viewerAccount: viewer,
    });
  }
}
