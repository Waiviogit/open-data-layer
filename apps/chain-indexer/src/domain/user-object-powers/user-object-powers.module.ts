import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories';
import { UserObjectPowersCreateListener } from './user-object-powers-create.listener';
import { UserObjectPowersUpdateListener } from './user-object-powers-update.listener';
import { UserObjectPowersEnsureService } from './user-object-powers-ensure.service';

@Module({
  imports: [RepositoriesModule],
  providers: [
    UserObjectPowersEnsureService,
    UserObjectPowersCreateListener,
    UserObjectPowersUpdateListener,
  ],
  exports: [UserObjectPowersEnsureService],
})
export class UserObjectPowersModule {}
