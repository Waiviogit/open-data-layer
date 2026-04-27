import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { DraftsModule } from '../domain/drafts/drafts.module';
import { FeedModule } from '../domain/feed';
import { ObjectsModule } from '../domain/objects';
import { UsersModule } from '../domain/users';
import { ObjectsController } from './objects.controller';
import { UserPostDraftsController } from './user-post-drafts.controller';
import { PostsController } from './posts.controller';
import { UsersController } from './users.controller';
import { UserThreadsController } from './user-threads.controller';

@Module({
  imports: [ObjectsModule, UsersModule, FeedModule, DraftsModule, AuthModule],
  controllers: [
    ObjectsController,
    UsersController,
    UserThreadsController,
    PostsController,
    UserPostDraftsController,
  ],
})
export class ControllersModule {}
