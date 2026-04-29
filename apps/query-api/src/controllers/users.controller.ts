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

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly getUserProfile: GetUserProfileEndpoint,
    private readonly getUserBlogFeed: GetUserBlogFeedEndpoint,
    private readonly getUserMentionsFeed: GetUserMentionsFeedEndpoint,
    private readonly getUserCategories: GetUserCategoriesEndpoint,
  ) {}

  @Get(':name/categories')
  async getCategories(
    @Param('name') name: string,
    @Query(new ZodQueryPipe(userCategoriesQuerySchema)) query: UserCategoriesQuery,
  ): Promise<UserCategoriesResponse> {
    return this.getUserCategories.execute(name, query);
  }

  @Get(':name/profile')
  async getProfile(@Param('name') name: string): Promise<UserProfileView> {
    const view = await this.getUserProfile.execute(name);
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
