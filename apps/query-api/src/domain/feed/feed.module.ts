import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection';
import { RepositoriesModule } from '../../repositories';
import { GetPostByKeyEndpoint } from './get-post-by-key.endpoint';
import { GetUserBlogFeedEndpoint } from './get-user-blog-feed.endpoint';
import { GetUserThreadsFeedEndpoint } from './get-user-threads-feed.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule, ObjectProjectionModule],
  providers: [
    GetUserBlogFeedEndpoint,
    GetUserThreadsFeedEndpoint,
    GetPostByKeyEndpoint,
  ],
  exports: [
    GetUserBlogFeedEndpoint,
    GetUserThreadsFeedEndpoint,
    GetPostByKeyEndpoint,
  ],
})
export class FeedModule {}
