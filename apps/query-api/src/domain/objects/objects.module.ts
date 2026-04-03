import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { RepositoriesModule } from '../../repositories';
import { GetObjectByIdEndpoint } from './get-object-by-id.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule],
  providers: [GetObjectByIdEndpoint],
  exports: [GetObjectByIdEndpoint],
})
export class ObjectsModule {}
