import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { HiveCommentParserModule } from '../hive-comment/hive-comment-parser.module';
import { HivePostSyncWorker } from './hive-post-sync.worker';
import { VoteHiveService } from './vote-hive.service';

@Module({
  imports: [RepositoriesModule, HiveCommentParserModule],
  providers: [VoteHiveService, HivePostSyncWorker],
  exports: [VoteHiveService],
})
export class HiveVoteModule {}
