import { Body, Controller, NotFoundException, Param, Post } from '@nestjs/common';
import {
  GetUserThreadsFeedEndpoint,
  userThreadsFeedBodySchema,
  type UserThreadsFeedBody,
  type UserBlogFeedResponse,
} from '../domain/feed';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodBodyPipe } from '../pipes';

@Controller({ path: 'users', version: '1' })
export class UserThreadsController {
  constructor(private readonly getUserThreadsFeed: GetUserThreadsFeedEndpoint) {}

  @Post(':name/threads')
  async getThreadsFeed(
    @Param('name') name: string,
    @Body(new ZodBodyPipe(userThreadsFeedBodySchema)) body: UserThreadsFeedBody,
    @ReqViewer() viewer: string | undefined,
  ): Promise<UserBlogFeedResponse> {
    const result = await this.getUserThreadsFeed.execute(name, body, viewer);
    if (!result) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return result;
  }
}
