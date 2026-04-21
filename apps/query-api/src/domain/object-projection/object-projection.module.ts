import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { RepositoriesModule } from '../../repositories';
import { ObjectProjectionService } from './object-projection.service';
import { ObjectSeoService } from './object-seo.service';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule],
  providers: [ObjectProjectionService, ObjectSeoService],
  exports: [ObjectProjectionService, ObjectSeoService],
})
export class ObjectProjectionModule {}
