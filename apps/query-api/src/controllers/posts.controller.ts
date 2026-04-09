import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import { GetPostByKeyEndpoint, type SinglePostViewDto } from '../domain/feed';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';

@Controller({ path: 'posts', version: '1' })
export class PostsController {
  constructor(private readonly getPostByKey: GetPostByKeyEndpoint) {}

  @Get(':author/:permlink')
  async getPost(
    @Param('author') author: string,
    @Param('permlink') permlink: string,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
  ): Promise<SinglePostViewDto> {
    const result = await this.getPostByKey.execute(
      author,
      permlink,
      locale,
      governanceObjectIdFromHeader,
    );
    if (!result) {
      throw new NotFoundException(`Post not found: ${author}/${permlink}`);
    }
    return result;
  }
}
