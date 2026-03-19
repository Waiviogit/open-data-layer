import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories';
import { ObjectCreateHandler } from './handlers/object-create.handler';
import { UpdateCreateHandler } from './handlers/update-create.handler';
import { UpdateVoteHandler } from './handlers/update-vote.handler';
import { RankVoteHandler } from './handlers/rank-vote.handler';
import { AuthorityHandler } from './handlers/authority.handler';
import { OdlCustomJsonParser } from './odl-custom-json-parser';
import {
  GovernanceWriteGuard,
  WRITE_GUARDS,
  WriteGuardRunner,
} from './guards';

@Module({
  imports: [RepositoriesModule],
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
    OdlCustomJsonParser,
  ],
  exports: [OdlCustomJsonParser],
})
export class OdlParserModule {}
