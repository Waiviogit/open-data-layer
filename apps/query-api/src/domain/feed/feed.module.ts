import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection';
import { RepositoriesModule } from '../../repositories';
import { GetPostByKeyEndpoint } from './get-post-by-key.endpoint';
import { GetUserBlogFeedEndpoint } from './get-user-blog-feed.endpoint';
import { GetUserCommentsFeedEndpoint } from './get-user-comments-feed.endpoint';
import { GetUserThreadsFeedEndpoint } from './get-user-threads-feed.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule, ObjectProjectionModule],
  providers: [
    GetUserBlogFeedEndpoint,
    GetUserThreadsFeedEndpoint,
    GetUserCommentsFeedEndpoint,
    GetPostByKeyEndpoint,
  ],
  exports: [
    GetUserBlogFeedEndpoint,
    GetUserThreadsFeedEndpoint,
    GetUserCommentsFeedEndpoint,
    GetPostByKeyEndpoint,
  ],
})
export class FeedModule {}
