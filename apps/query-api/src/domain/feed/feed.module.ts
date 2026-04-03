import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { RepositoriesModule } from '../../repositories';
import { GetUserBlogFeedEndpoint } from './get-user-blog-feed.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule],
  providers: [GetUserBlogFeedEndpoint],
  exports: [GetUserBlogFeedEndpoint],
})
export class FeedModule {}
