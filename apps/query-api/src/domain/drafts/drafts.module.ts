import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories';
import { UserPostDraftsService } from './user-post-drafts.service';

@Module({
  imports: [RepositoriesModule],
  providers: [UserPostDraftsService],
  exports: [UserPostDraftsService],
})
export class DraftsModule {}
