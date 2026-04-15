import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { CommentPostObjectBindService } from './comment-post-object-bind.service';
import { CommentOperationOrchestrator } from './comment-orchestrator.service';
import { PostUpsertService } from './post-upsert.service';
import { ThreadParseService } from './thread-parse.service';

@Module({
  imports: [RepositoriesModule],
  providers: [
    PostUpsertService,
    ThreadParseService,
    CommentPostObjectBindService,
    CommentOperationOrchestrator,
  ],
  exports: [CommentOperationOrchestrator],
})
export class HiveCommentParserModule {}
