import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance/governance.module';
import { RepositoriesModule } from '../../repositories';
import { UserObjectPowersModule } from '../user-object-powers/user-object-powers.module';
import { RankScoreService } from './rank-score.service';

@Module({
  imports: [RepositoriesModule, GovernanceModule, UserObjectPowersModule],
  providers: [RankScoreService],
  exports: [RankScoreService],
})
export class RankScoreModule {}
