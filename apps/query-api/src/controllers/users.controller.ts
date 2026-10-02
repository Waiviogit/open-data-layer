import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  GetUserBlogFeedEndpoint,
  GetUserBlogObjectFiltersEndpoint,
  GetUserFeedUnreadCountsEndpoint,
  GetUserMentionsFeedEndpoint,
  MarkProfileFeedReadEndpoint,
  markProfileFeedReadBodySchema,
  userBlogFeedBodySchema,
  userBlogObjectFiltersQuerySchema,
  type FeedUnreadCountsResponse,
  type MarkProfileFeedReadBody,
  type MarkProfileFeedReadResponse,
  type UserBlogFeedBody,
  type UserBlogFeedResponse,
  type UserBlogObjectFiltersQuery,
  type UserBlogObjectFiltersResponseDto,
} from '../domain/feed';
import {
  GetUserProfileEndpoint,
  GetUserAccountSidebarEndpoint,
  type UserProfileView,
  type UserAccountSidebarView,
  GetUserNotificationSettingsEndpoint,
  type UserNotificationSettingsView,
} from '../domain/users';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqLocale } from '../http/locale-header.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodBodyPipe, ZodQueryPipe } from '../pipes';
import {
  GetUserCategoriesEndpoint,
  userCategoriesQuerySchema,
  type UserCategoriesResponse,
  type UserCategoriesQuery,
} from '../domain/categories';
import {
  GetUserShopFiltersEndpoint,
  GetUserShopObjectsEndpoint,
  GetUserShopSectionsEndpoint,
  shopFiltersQuerySchema,
  shopObjectsQuerySchema,
  shopSectionsQuerySchema,
  type ShopFiltersQuery,
  type ShopObjectsQuery,
  type ShopObjectsResponse,
  type ShopSectionsQuery,
  type ShopSectionsResponse,
  type UserShopFiltersResponseDto,
} from '../domain/shop';
import {
  GetUserFollowersEndpoint,
  GetUserFollowingEndpoint,
  GetUserFollowingObjectsEndpoint,
  GetUserAuthorityGrantorsEndpoint,
  GetUserAuthorityGranteesEndpoint,
  userSocialListQuerySchema,
  userFollowingObjectsQuerySchema,
  userAccountAuthListQuerySchema,
  type PaginatedProjectedObjects,
  type PaginatedUserFollowList,
  type PaginatedUserAccountAuthGrantors,
  type PaginatedUserAccountAuthGrantees,
  type UserFollowingObjectsQuery,
  type UserSocialListQuery,
  type UserAccountAuthListQuery,
} from '../domain/social';
import {
  GetUserFavoritesEndpoint,
  GetUserFavoritesTypesEndpoint,
  PostUserFavoritesMapEndpoint,
  userFavoritesMapBodySchema,
  userFavoritesQuerySchema,
  type UserFavoritesMapBody,
  type UserFavoritesQuery,
  type UserFavoritesTypesResponse,
} from '../domain/favorites';
import {
  GetUserExpertiseCountersEndpoint,
  GetUserExpertiseObjectsEndpoint,
  userExpertiseObjectsQuerySchema,
  type PaginatedExpertiseObjects,
  type UserExpertiseCountersResponse,
  type UserExpertiseObjectsQuery,
} from '../domain/expertise';
import {
  GetMemoPublicKeyEndpoint,
  type MemoPublicKeyResponseDto,
} from '../domain/messaging/get-memo-public-key.endpoint';
import {
  GetFollowedObjectsMessagesEndpoint,
  type FollowedObjectsMessagesResponseDto,
} from '../domain/messaging';
import {
  objectActivityMessageHistoryBodySchema,
  type ObjectActivityMessageHistoryBody,
} from '../domain/messaging/schemas/messaging.schema';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly getUserProfile: GetUserProfileEndpoint,
    private readonly getUserBlogFeed: GetUserBlogFeedEndpoint,
    private readonly getUserBlogObjectFilters: GetUserBlogObjectFiltersEndpoint,
    private readonly getUserMentionsFeed: GetUserMentionsFeedEndpoint,
    private readonly getUserFeedUnreadCounts: GetUserFeedUnreadCountsEndpoint,
    private readonly markProfileFeedRead: MarkProfileFeedReadEndpoint,
    private readonly getUserCategories: GetUserCategoriesEndpoint,
    private readonly getUserShopObjects: GetUserShopObjectsEndpoint,
    private readonly getUserShopSections: GetUserShopSectionsEndpoint,
    private readonly getUserShopFilters: GetUserShopFiltersEndpoint,
    private readonly getUserFollowers: GetUserFollowersEndpoint,
    private readonly getUserFollowing: GetUserFollowingEndpoint,
    private readonly getUserFollowingObjects: GetUserFollowingObjectsEndpoint,
    private readonly getUserAuthorityGrantors: GetUserAuthorityGrantorsEndpoint,
    private readonly getUserAuthorityGrantees: GetUserAuthorityGranteesEndpoint,
    private readonly getUserFavoritesTypes: GetUserFavoritesTypesEndpoint,
    private readonly getUserFavorites: GetUserFavoritesEndpoint,
    private readonly postUserFavoritesMap: PostUserFavoritesMapEndpoint,
    private readonly getUserExpertiseCounters: GetUserExpertiseCountersEndpoint,
    private readonly getUserExpertiseObjects: GetUserExpertiseObjectsEndpoint,
    private readonly getUserAccountSidebar: GetUserAccountSidebarEndpoint,
    private readonly getUserNotificationSettings: GetUserNotificationSettingsEndpoint,
    private readonly getMemoPublicKey: GetMemoPublicKeyEndpoint,
    private readonly getFollowedObjectsMessages: GetFollowedObjectsMessagesEndpoint,
  ) {}

  @Get(':name/categories')
  async getCategories(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userCategoriesQuerySchema)) query: UserCategoriesQuery,
  ): Promise<UserCategoriesResponse> {
    return this.getUserCategories.execute(name, query);
  }

  @Get(':name/shop/filters')
  async getShopFilters(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(shopFiltersQuerySchema)) query: ShopFiltersQuery,
  ): Promise<UserShopFiltersResponseDto | null> {
    return this.getUserShopFilters.execute(name, query);
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

  @Post(':name/following-objects/messages')
  async getFollowedObjectMessages(
    @Param('name') name: string,
    @Body(new ZodBodyPipe(objectActivityMessageHistoryBodySchema))
    body: ObjectActivityMessageHistoryBody,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<FollowedObjectsMessagesResponseDto> {
    const result = await this.getFollowedObjectsMessages.execute(
      name,
      body,
      governanceObjectIdFromHeader,
      viewer,
    );
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/authority-grantors')
  async getAuthorityGrantors(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userAccountAuthListQuerySchema)) query: UserAccountAuthListQuery,
  ): Promise<PaginatedUserAccountAuthGrantors> {
    const result = await this.getUserAuthorityGrantors.execute(name, query);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/authority-grantees')
  async getAuthorityGrantees(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userAccountAuthListQuerySchema)) query: UserAccountAuthListQuery,
  ): Promise<PaginatedUserAccountAuthGrantees> {
    const result = await this.getUserAuthorityGrantees.execute(name, query);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/favorites/types')
  async getFavoritesTypes(@Param('name') name: string): Promise<UserFavoritesTypesResponse> {
    return this.getUserFavoritesTypes.execute(name);
  }

  @Post(':name/favorites/map')
  async postFavoritesMap(
    @Param('name') name: string,
    @Body(new ZodBodyPipe(userFavoritesMapBodySchema)) body: UserFavoritesMapBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ) {
    const result = await this.postUserFavoritesMap.execute(
      name,
      body,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
    return result ?? { items: [], hasMore: false };
  }

  @Get(':name/favorites')
  async getFavorites(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userFavoritesQuerySchema)) query: UserFavoritesQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedProjectedObjects | null> {
    return this.getUserFavorites.execute(
      name,
      query,
      locale,
      governanceObjectIdFromHeader,
      viewer,
    );
  }

  @Get(':name/expertise/counters')
  async getExpertiseCounters(
    @Param('name') name: string,
  ): Promise<UserExpertiseCountersResponse> {
    const result = await this.getUserExpertiseCounters.execute(name);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/expertise/objects')
  async getExpertiseObjects(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userExpertiseObjectsQuerySchema)) query: UserExpertiseObjectsQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<PaginatedExpertiseObjects> {
    const result = await this.getUserExpertiseObjects.execute(
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

  @Get(':name/feed-unread-counts')
  async getFeedUnreadCounts(
    @Param('name') name: string,
    @ReqViewer() viewer: string | undefined,
  ): Promise<FeedUnreadCountsResponse> {
    const result = await this.getUserFeedUnreadCounts.execute(name, viewer);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Post(':name/feed-read')
  async markFeedRead(
    @Param('name') name: string,
    @Body(new ZodBodyPipe(markProfileFeedReadBodySchema)) body: MarkProfileFeedReadBody,
    @ReqViewer() viewer: string | undefined,
  ): Promise<MarkProfileFeedReadResponse> {
    const result = await this.markProfileFeedRead.execute(name, body, viewer);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }

  @Get(':name/notification-settings')
  async getNotificationSettings(
    @Param('name') name: string,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserNotificationSettingsView> {
    return this.getUserNotificationSettings.execute(name, viewer);
  }

  @Get(':name/memo-public-key')
  async getMemoPublicKeyRoute(
    @Param('name') name: string,
  ): Promise<MemoPublicKeyResponseDto> {
    return this.getMemoPublicKey.execute(name);
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

  @Get(':name/account-sidebar')
  async getAccountSidebar(
    @Param('name') name: string,
  ): Promise<UserAccountSidebarView> {
    const view = await this.getUserAccountSidebar.execute(name);
    if (!view) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return view;
  }

  @Get(':name/blog/object-filters')
  async getBlogObjectFilters(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userBlogObjectFiltersQuerySchema)) query: UserBlogObjectFiltersQuery,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserBlogObjectFiltersResponseDto> {
    const result = await this.getUserBlogObjectFilters.execute(
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
