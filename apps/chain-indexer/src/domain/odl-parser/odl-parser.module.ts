import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance/governance.module';
import { RepositoriesModule } from '../../repositories';
import { ObjectCreateHandler } from './handlers/object-create.handler';
import { UpdateCreateHandler } from './handlers/update-create.handler';
import { UpdateVoteHandler } from './handlers/update-vote.handler';
import { RankVoteHandler } from './handlers/rank-vote.handler';
import { AuthorityHandler } from './handlers/authority.handler';
import { UserMetadataHandler } from './handlers/user-metadata.handler';
import { ShopDeselectHandler } from './handlers/shop-deselect.handler';
import { BatchImportHandler } from './handlers/batch-import.handler';
import { BatchImportWorker } from './batch-import.worker';
import { OdlCustomJsonParser } from './odl-custom-json-parser';
import { MetaGroupSyncHandler } from './handlers/meta-group-sync.handler';
import { CategorySyncHandler } from './handlers/category-sync.handler';
import { ObjectCategoriesWorker } from './object-categories.worker';
import { ObjectCategoriesRelatedWorker } from './object-categories-related.worker';
import {
  GovernanceWriteGuard,
  WRITE_GUARDS,
  WriteGuardRunner,
} from './guards';

@Module({
  imports: [RepositoriesModule, GovernanceModule, ObjectsDomainModule],
  providers: [
    GovernanceWriteGuard,
    WriteGuardRunner,
    {
      provide: WRITE_GUARDS,
      useFactory: (gov: GovernanceWriteGuard) => [gov],
      inject: [GovernanceWriteGuard],
    },
    ObjectCreateHandler,
    UpdateCreateHandler,
    UpdateVoteHandler,
    RankVoteHandler,
    AuthorityHandler,
    UserMetadataHandler,
    ShopDeselectHandler,
    BatchImportHandler,
    BatchImportWorker,
    OdlCustomJsonParser,
    MetaGroupSyncHandler,
    CategorySyncHandler,
    ObjectCategoriesWorker,
    ObjectCategoriesRelatedWorker,
  ],
  exports: [OdlCustomJsonParser],
})
export class OdlParserModule {}
