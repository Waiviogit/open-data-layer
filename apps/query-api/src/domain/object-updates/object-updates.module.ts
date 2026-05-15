import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance';
import { RepositoriesModule } from '../../repositories';
import { GetObjectUpdatesFeedEndpoint } from './get-object-updates-feed.endpoint';

@Module({
  imports: [RepositoriesModule, GovernanceModule],
  providers: [GetObjectUpdatesFeedEndpoint],
  exports: [GetObjectUpdatesFeedEndpoint],
})
export class ObjectUpdatesModule {}
