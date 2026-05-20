import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import {
  GetUserBlogFeedEndpoint,
  GetUserMentionsFeedEndpoint,
  userBlogFeedBodySchema,
  type UserBlogFeedBody,
  type UserBlogFeedResponse,
} from '../domain/feed';
import {
  GetUserProfileEndpoint,
  type UserProfileView,
} from '../domain/users';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodBodyPipe, ZodQueryPipe } from '../pipes';
import {
  GetUserCategoriesEndpoint,
  userCategoriesQuerySchema,
  type UserCategoriesResponse,
  type UserCategoriesQuery,
} from '../domain/categories';
import {
  GetUserShopObjectsEndpoint,
  GetUserShopSectionsEndpoint,
  shopObjectsQuerySchema,
  shopSectionsQuerySchema,
  type ShopObjectsQuery,
  type ShopObjectsResponse,
  type ShopSectionsQuery,
  type ShopSectionsResponse,
} from '../domain/shop';
import {
  GetUserFollowersEndpoint,
  GetUserFollowingEndpoint,
  GetUserFollowingObjectsEndpoint,
  userSocialListQuerySchema,
  userFollowingObjectsQuerySchema,
  type PaginatedProjectedObjects,
  type PaginatedUserFollowList,
  type UserFollowingObjectsQuery,
  type UserSocialListQuery,
} from '../domain/social';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly getUserProfile: GetUserProfileEndpoint,
    private readonly getUserBlogFeed: GetUserBlogFeedEndpoint,
    private readonly getUserMentionsFeed: GetUserMentionsFeedEndpoint,
    private readonly getUserCategories: GetUserCategoriesEndpoint,
    private readonly getUserShopObjects: GetUserShopObjectsEndpoint,
    private readonly getUserShopSections: GetUserShopSectionsEndpoint,
    private readonly getUserFollowers: GetUserFollowersEndpoint,
    private readonly getUserFollowing: GetUserFollowingEndpoint,
    private readonly getUserFollowingObjects: GetUserFollowingObjectsEndpoint,
  ) {}

  @Get(':name/categories')
  async getCategories(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userCategoriesQuerySchema)) query: UserCategoriesQuery,
  ): Promise<UserCategoriesResponse> {
    return this.getUserCategories.execute(name, query);
  }

  @Get(':name/shop-objects')
  async getShopObjects(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(shopObjectsQuerySchema)) query: ShopObjectsQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ShopObjectsResponse | null> {
    return this.getUserShopObjects.execute(
      name,
      query,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
  }

  @Get(':name/shop-sections')
  async getShopSections(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(shopSectionsQuerySchema)) query: ShopSectionsQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ShopSectionsResponse | null> {
    return this.getUserShopSections.execute(
      name,
      query,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
  }

  @Get(':name/followers')
  async getFollowers(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userSocialListQuerySchema)) query: UserSocialListQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedUserFollowList> {
    const result = await this.getUserFollowers.execute(name, query, viewer);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/following')
  async getFollowing(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userSocialListQuerySchema)) query: UserSocialListQuery,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedUserFollowList> {
    const result = await this.getUserFollowing.execute(name, query, viewer);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/following-objects')
  async getFollowingObjects(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userFollowingObjectsQuerySchema)) query: UserFollowingObjectsQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedProjectedObjects> {
    const result = await this.getUserFollowingObjects.execute(
      name,
      query,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/profile')
  async getProfile(
    @Param('name') name: string,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserProfileView> {
    const view = await this.getUserProfile.execute(name, viewer);
    if (!view) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return view;
  }

  @Post(':name/blog')
  async getBlogFeed(
    @Param('name') name: string,
    @Body(new ZodBodyPipe(userBlogFeedBodySchema)) body: UserBlogFeedBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserBlogFeedResponse> {
    const result = await this.getUserBlogFeed.execute(
      name,
      body,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Post(':name/mentions')
  async getMentionsFeed(
    @Param('name') name: string,
    @Body(new ZodBodyPipe(userBlogFeedBodySchema)) body: UserBlogFeedBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserBlogFeedResponse> {
    const result = await this.getUserMentionsFeed.execute(
      name,
      body,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }
}
