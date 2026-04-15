import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { FollowSocialService } from './follow-social.service';
import { ReblogSocialService } from './reblog-social.service';
import { AccountProfileUpdateService } from './account-profile-update.service';
import { AccountEnsureService } from './account-ensure.service';

@Module({
  imports: [RepositoriesModule],
  providers: [
    FollowSocialService,
    ReblogSocialService,
    AccountProfileUpdateService,
    AccountEnsureService,
  ],
  exports: [
    FollowSocialService,
    ReblogSocialService,
    AccountProfileUpdateService,
    AccountEnsureService,
  ],
})
export class HiveSocialModule {}
