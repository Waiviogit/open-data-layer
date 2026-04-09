import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { RepositoriesModule } from '../../repositories';
import { GetPostByKeyEndpoint } from './get-post-by-key.endpoint';
import { GetUserBlogFeedEndpoint } from './get-user-blog-feed.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule],
  providers: [GetUserBlogFeedEndpoint, GetPostByKeyEndpoint],
  exports: [GetUserBlogFeedEndpoint, GetPostByKeyEndpoint],
})
export class FeedModule {}
