import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { FollowSocialService } from './follow-social.service';
import { ReblogSocialService } from './reblog-social.service';
import { AccountProfileUpdateService } from './account-profile-update.service';
import { AccountEnsureService } from './account-ensure.service';
import { AccountSyncWorker } from './account-sync.worker';

@Module({
  imports: [RepositoriesModule],
  providers: [
    FollowSocialService,
    ReblogSocialService,
    AccountProfileUpdateService,
    AccountEnsureService,
    AccountSyncWorker,
  ],
  exports: [
    FollowSocialService,
    ReblogSocialService,
    AccountProfileUpdateService,
    AccountEnsureService,
  ],
})
export class HiveSocialModule {}
