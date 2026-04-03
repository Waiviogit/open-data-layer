import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import {
  GetUserBlogFeedEndpoint,
  userBlogFeedBodySchema,
  type UserBlogFeedBody,
  type UserBlogFeedResponse,
} from '../domain/feed';
import {
  GetUserProfileEndpoint,
  type UserProfileView,
} from '../domain/users';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ZodBodyPipe } from '../pipes';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly getUserProfile: GetUserProfileEndpoint,
    private readonly getUserBlogFeed: GetUserBlogFeedEndpoint,
  ) {}

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
  ): Promise<UserBlogFeedResponse> {
    const result = await this.getUserBlogFeed.execute(
      name,
      body,
      locale,
      governanceObjectIdFromHeader,
    );
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }
}
