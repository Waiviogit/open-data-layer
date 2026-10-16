import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories';
import { GetUserProfileEndpoint } from './get-user-profile.endpoint';
import { GetUserNotificationSettingsEndpoint } from './get-user-notification-settings.endpoint';
import { GetUserAccountSidebarEndpoint } from './get-user-account-sidebar.endpoint';
import { HiveAccountsCache } from './hive-accounts.cache';
import { HiveRewardFundCache } from './hive-reward-fund.cache';
import { WaivDieselPoolCache } from './waiv-diesel-pool.cache';
import { WaivRewardPoolCache } from './waiv-reward-pool.cache';

@Module({
  imports: [RepositoriesModule],
  providers: [
    GetUserProfileEndpoint,
    GetUserNotificationSettingsEndpoint,
    GetUserAccountSidebarEndpoint,
    HiveAccountsCache,
    HiveRewardFundCache,
    WaivRewardPoolCache,
    WaivDieselPoolCache,
  ],
  exports: [
    GetUserProfileEndpoint,
    GetUserNotificationSettingsEndpoint,
    GetUserAccountSidebarEndpoint,
  ],
})
export class UsersModule {}
