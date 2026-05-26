import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { RepositoriesModule } from '../../repositories';
import { ObjectProjectionService } from './object-projection.service';
import { ObjectSeoService } from './object-seo.service';
import { ListItemsRecursiveCountService } from './list-items-recursive-count.service';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule],
  providers: [ObjectProjectionService, ObjectSeoService, ListItemsRecursiveCountService],
  exports: [ObjectProjectionService, ObjectSeoService, ListItemsRecursiveCountService],
})
export class ObjectProjectionModule {}
