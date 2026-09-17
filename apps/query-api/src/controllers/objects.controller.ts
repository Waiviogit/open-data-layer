import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Param,
} from '@nestjs/common';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import {
  CheckObjectExistsEndpoint,
  GetObjectByIdEndpoint,
  GetNestedObjectsEndpoint,
  GetObjectFollowersEndpoint,
  GetObjectExpertsEndpoint,
  GetObjectFavoritedByEndpoint,
  GetObjectOwnershipEndpoint,
  GetObjectRefListEndpoint,
  GetObjectFieldReferencesSummaryEndpoint,
  GetObjectFieldReferencesByTypeEndpoint,
  GetObjectRelatedAlbumEndpoint,
  GetObjectRelatedAlbumPreviewEndpoint,
  GetObjectOptionsEndpoint,
  relatedAlbumListQuerySchema,
  relatedAlbumPreviewQuerySchema,
  objectRefListQuerySchema,
  objectFieldReferencesSummaryQuerySchema,
  resolveObjectBodySchema,
  resolveNestedObjectsBodySchema,
  type RelatedAlbumListQuery,
  type RelatedAlbumListResponseDto,
  type RelatedAlbumPreviewQuery,
  type RelatedAlbumPreviewResponseDto,
  type ProjectedObjectWithCounts,
  type ResolveObjectBody,
  type ResolveNestedObjectsBody,
  type ResolveNestedObjectsResponse,
  type ObjectRefListQuery,
  type ObjectRefListResponseDto,
  type ObjectFieldReferencesSummaryQuery,
  type ObjectFieldReferencesSummaryResponseDto,
  type ObjectFieldReferencesByTypeQuery,
  type ObjectFieldReferencesByTypeResponseDto,
  type ObjectOptionsResponseDto,
  objectExpertListQuerySchema,
  type PaginatedObjectExpertList,
  type ObjectExpertListQuery,
} from '../domain/objects';
import {
  userSocialListQuerySchema,
  objectOwnershipQuerySchema,
  type PaginatedUserFollowList,
  type UserSocialListQuery,
  type ObjectOwnershipQuery,
} from '../domain/social';
import {
  GetObjectUpdatesFeedEndpoint,
  GetUpdateVotersEndpoint,
  objectUpdatesFeedQuerySchema,
  type ObjectUpdatesFeedQuery,
  type ObjectUpdatesFeedResponseDto,
  type ObjectUpdateFeedItemDto,
  type UpdateVotersResponseDto,
} from '../domain/object-updates';
import {
  GetObjectPostsFeedEndpoint,
  GetObjectThreadsFeedEndpoint,
  objectPostsFeedBodySchema,
  type ObjectPostsFeedBody,
  userThreadsFeedBodySchema,
  type UserThreadsFeedBody,
  type UserBlogFeedResponse,
} from '../domain/feed';
import {
  CheckActivityDuplicateEndpoint,
  GetObjectChannelEndpoint,
  GetObjectChannelMessagesEndpoint,
} from '../domain/messaging';
import {
  activityDedupCheckBodySchema,
  messageHistoryBodySchema,
  type ActivityDedupCheckBody,
  type MessageHistoryBody,
} from '../domain/messaging/schemas/messaging.schema';
import type {
  ActivityDedupCheckDto,
  MessageHistoryResponseDto,
} from '../domain/messaging';
import type { ChannelDetailDto } from '../domain/messaging/get-channel-by-id.endpoint';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqLocale } from '../http/locale-header.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodBodyPipe, ZodQueryPipe } from '../pipes';

@Controller({ path: 'objects', version: ['1', '2'] })
export class ObjectsController {
  constructor(
    private readonly getObjectById: GetObjectByIdEndpoint,
    private readonly getNestedObjects: GetNestedObjectsEndpoint,
    private readonly getObjectUpdatesFeed: GetObjectUpdatesFeedEndpoint,
    private readonly getUpdateVoters: GetUpdateVotersEndpoint,
    private readonly getObjectFollowersEndpoint: GetObjectFollowersEndpoint,
    private readonly getObjectExpertsEndpoint: GetObjectExpertsEndpoint,
    private readonly getObjectFavoritedByEndpoint: GetObjectFavoritedByEndpoint,
    private readonly getObjectOwnershipEndpoint: GetObjectOwnershipEndpoint,
    private readonly getObjectRefListEndpoint: GetObjectRefListEndpoint,
    private readonly getObjectFieldReferencesSummaryEndpoint: GetObjectFieldReferencesSummaryEndpoint,
    private readonly getObjectFieldReferencesByTypeEndpoint: GetObjectFieldReferencesByTypeEndpoint,
    private readonly getObjectRelatedAlbumPreviewEndpoint: GetObjectRelatedAlbumPreviewEndpoint,
    private readonly getObjectRelatedAlbumEndpoint: GetObjectRelatedAlbumEndpoint,
    private readonly checkObjectExists: CheckObjectExistsEndpoint,
    private readonly getObjectPostsFeed: GetObjectPostsFeedEndpoint,
    private readonly getObjectThreadsFeed: GetObjectThreadsFeedEndpoint,
    private readonly getObjectOptions: GetObjectOptionsEndpoint,
    private readonly getObjectChannelEndpoint: GetObjectChannelEndpoint,
    private readonly getObjectChannelMessagesEndpoint: GetObjectChannelMessagesEndpoint,
    private readonly checkActivityDuplicate: CheckActivityDuplicateEndpoint,
  ) {}

  @Get(':objectId/exists')
  async exists(
    @Param('objectId') rawObjectId: string,
  ): Promise<{ exists: boolean }> {
    const objectId = decodeURIComponent(rawObjectId);
    const exists = await this.checkObjectExists.execute(objectId);
    return { exists };
  }

  @Get(':objectId/gallery/related/preview')
  async getObjectRelatedAlbumPreview(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(relatedAlbumPreviewQuerySchema))
    query: RelatedAlbumPreviewQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
  ): Promise<RelatedAlbumPreviewResponseDto> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectRelatedAlbumPreviewEndpoint.execute(
      decodedId,
      query,
      locale,
      governanceObjectIdFromHeader,
    );
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/gallery/related')
  async getObjectRelatedAlbumList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(relatedAlbumListQuerySchema)) query: RelatedAlbumListQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
  ): Promise<RelatedAlbumListResponseDto> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectRelatedAlbumEndpoint.execute(
      decodedId,
      query,
      locale,
      governanceObjectIdFromHeader,
    );
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/options')
  async getObjectOptionsList(
    @Param('objectId') objectId: string,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectOptionsResponseDto> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectOptions.execute(
      decodedId,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/field-references')
  async getObjectFieldReferencesSummary(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectFieldReferencesSummaryQuerySchema))
    query: ObjectFieldReferencesSummaryQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectFieldReferencesSummaryResponseDto> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectFieldReferencesSummaryEndpoint.execute(
      decodedId,
      query,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/field-references/:referenceObjectType')
  async getObjectFieldReferencesByType(
    @Param('objectId') objectId: string,
    @Param('referenceObjectType') referenceObjectType: string,
    @Query(new ZodQueryPipe(objectRefListQuerySchema)) query: ObjectFieldReferencesByTypeQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectFieldReferencesByTypeResponseDto> {
    const decodedId = decodeURIComponent(objectId);
    const decodedType = decodeURIComponent(referenceObjectType);
    const result = await this.getObjectFieldReferencesByTypeEndpoint.executeByType(
      decodedId,
      decodedType,
      query,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/related')
  async getObjectRelatedList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectRefListQuerySchema)) query: ObjectRefListQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectRefListResponseDto> {
    return this.getObjectRefList(objectId, UPDATE_TYPES.IS_RELATED_TO, query, locale, governanceObjectIdFromHeader, viewer);
  }

  @Get(':objectId/similar')
  async getObjectSimilarList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectRefListQuerySchema)) query: ObjectRefListQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectRefListResponseDto> {
    return this.getObjectRefList(objectId, UPDATE_TYPES.IS_SIMILAR_TO, query, locale, governanceObjectIdFromHeader, viewer);
  }

  @Get(':objectId/add-on')
  async getObjectAddOnList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectRefListQuerySchema)) query: ObjectRefListQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectRefListResponseDto> {
    return this.getObjectRefList(objectId, UPDATE_TYPES.ADD_ON, query, locale, governanceObjectIdFromHeader, viewer);
  }

  private async getObjectRefList(
    objectId: string,
    updateType:
      | typeof UPDATE_TYPES.IS_RELATED_TO
      | typeof UPDATE_TYPES.IS_SIMILAR_TO
      | typeof UPDATE_TYPES.ADD_ON,
    query: ObjectRefListQuery,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
    viewer: string | undefined,
  ): Promise<ObjectRefListResponseDto> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectRefListEndpoint.execute(
      decodedId,
      updateType,
      query,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/favorited-by')
  async getObjectFavoritedByList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(userSocialListQuerySchema)) query: UserSocialListQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedUserFollowList> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectFavoritedByEndpoint.execute(decodedId, query, viewer);
    if (!result) {
      throw new NotFoundException(`Object not found: ${decodedId}`);
    }
    return result;
  }

  @Get(':objectId/ownership')
  async getObjectOwnershipList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectOwnershipQuerySchema)) query: ObjectOwnershipQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedUserFollowList> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectOwnershipEndpoint.execute(decodedId, query, viewer);
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

  @Get(':objectId/experts')
  async getObjectExpertsList(
    @Param('objectId') objectId: string,
    @Query(new ZodQueryPipe(objectExpertListQuerySchema)) query: ObjectExpertListQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedObjectExpertList> {
    const decodedId = decodeURIComponent(objectId);
    const result = await this.getObjectExpertsEndpoint.execute(decodedId, query, viewer);
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

  @Get(':objectId/updates/:updateId')
  async getUpdateById(
    @Param('objectId') objectId: string,
    @Param('updateId') updateId: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ObjectUpdateFeedItemDto> {
    const decodedObjectId = decodeURIComponent(objectId);
    const decodedUpdateId = decodeURIComponent(updateId);
    const result = await this.getObjectUpdatesFeed.executeByUpdateId({
      objectId: decodedObjectId,
      updateId: decodedUpdateId,
      governanceObjectIdFromHeader,
      viewerAccount: viewer,
    });
    if (!result) {
      throw new NotFoundException(
        `Update not found: ${decodedUpdateId} on object ${decodedObjectId}`,
      );
    }
    return result;
  }

  @Get(':objectId/updates/:updateId/voters')
  async getUpdateVotersList(
    @Param('objectId') objectId: string,
    @Param('updateId') updateId: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
  ): Promise<UpdateVotersResponseDto> {
    const decodedObjectId = decodeURIComponent(objectId);
    const decodedUpdateId = decodeURIComponent(updateId);
    const result = await this.getUpdateVoters.execute({
      objectId: decodedObjectId,
      updateId: decodedUpdateId,
      governanceObjectIdFromHeader,
    });
    if (!result) {
      throw new NotFoundException(
        `Update not found: ${decodedUpdateId} on object ${decodedObjectId}`,
      );
    }
    return result;
  }

  @Post(':objectId/posts')
  async getObjectPosts(
    @Param('objectId') rawObjectId: string,
    @Body(new ZodBodyPipe(objectPostsFeedBodySchema)) body: ObjectPostsFeedBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserBlogFeedResponse> {
    const objectId = decodeURIComponent(rawObjectId);
    const result = await this.getObjectPostsFeed.execute(
      objectId,
      body,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`Object not found: ${objectId}`);
    }
    return result;
  }

  @Post(':objectId/threads')
  async getObjectThreads(
    @Param('objectId') rawObjectId: string,
    @Body(new ZodBodyPipe(userThreadsFeedBodySchema)) body: UserThreadsFeedBody,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserBlogFeedResponse> {
    const objectId = decodeURIComponent(rawObjectId);
    const result = await this.getObjectThreadsFeed.execute(objectId, body, viewer);
    if (!result) {
      throw new NotFoundException(`Object not found: ${objectId}`);
    }
    return result;
  }

  @Get(':objectId/channel')
  async getObjectChannel(
    @Param('objectId') rawObjectId: string,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ChannelDetailDto> {
    const objectId = decodeURIComponent(rawObjectId);
    const result = await this.getObjectChannelEndpoint.execute(objectId, viewer);
    if (!result) {
      throw new NotFoundException(`Object channel not found: ${objectId}`);
    }
    return result;
  }

  @Post(':objectId/channel/messages')
  async getObjectChannelMessages(
    @Param('objectId') rawObjectId: string,
    @Body(new ZodBodyPipe(messageHistoryBodySchema)) body: MessageHistoryBody,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<MessageHistoryResponseDto> {
    const objectId = decodeURIComponent(rawObjectId);
    const result = await this.getObjectChannelMessagesEndpoint.execute(
      objectId,
      body,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`Object channel not found: ${objectId}`);
    }
    return result;
  }

  @Post(':objectId/channel/messages/dedup-check')
  async checkObjectActivityDuplicate(
    @Param('objectId') rawObjectId: string,
    @Body(new ZodBodyPipe(activityDedupCheckBodySchema)) body: ActivityDedupCheckBody,
  ): Promise<ActivityDedupCheckDto> {
    const objectId = decodeURIComponent(rawObjectId);
    const result = await this.checkActivityDuplicate.execute(objectId, body);
    if (!result) {
      throw new NotFoundException(`Object not found: ${objectId}`);
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
      updateTypes: body.update_types,
      locale,
      governanceObjectIdFromHeader,
      viewerAccount: viewer,
    });
  }
}
