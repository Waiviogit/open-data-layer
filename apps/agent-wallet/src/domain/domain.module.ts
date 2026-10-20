import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  HiveBroadcastService,
  WalletAccountsService,
  WalletStatusService,
} from './hive-broadcast.service';
import { HasSessionService } from './has-session.service';
import { HiveChainContextService } from './hive-chain-context.service';
import { HiveAccountGenerateService } from './hive-account-generate.service';
import { HivePostingAuthorityGrantBuildService } from './hive-posting-authority-grant-build.service';
import { HivePostBuildService } from './hive-post-build.service';
import { IpfsUploadService } from './ipfs-upload.service';
import { LocalKeysService } from './local-keys.service';
import { NotificationsSocketService } from './notifications-socket.service';
import { OslMessagingService } from './osl-messaging.service';
import { PendingRequestsStore } from './pending-requests.store';
import { WaivioAuthClientService } from './waivio-auth-client.service';
import { WaivioAuthOrchestratorService } from './waivio-auth-orchestrator.service';
import { WaivioAuthSessionService } from './waivio-auth-session.service';
import { HiveEngineDepositBuildService } from './hive-engine-deposit-build.service';
import { WalletDelegationBuildService } from './wallet-delegation-build.service';
import { WalletSignerResolverService } from './wallet-signer-resolver.service';

@Module({
  imports: [AuthModule],
  providers: [
    PendingRequestsStore,
    HasSessionService,
    WaivioAuthClientService,
    WaivioAuthSessionService,
    WaivioAuthOrchestratorService,
    LocalKeysService,
    WalletSignerResolverService,
    OslMessagingService,
    NotificationsSocketService,
    HiveBroadcastService,
    WalletStatusService,
    WalletAccountsService,
    HivePostBuildService,
    HiveChainContextService,
    WalletDelegationBuildService,
    HiveEngineDepositBuildService,
    HivePostingAuthorityGrantBuildService,
    HiveAccountGenerateService,
    IpfsUploadService,
  ],
  exports: [
    HasSessionService,
    HivePostBuildService,
    WalletDelegationBuildService,
    HiveEngineDepositBuildService,
    HivePostingAuthorityGrantBuildService,
    HiveAccountGenerateService,
    WaivioAuthOrchestratorService,
    WaivioAuthSessionService,
    HiveBroadcastService,
    WalletStatusService,
    WalletAccountsService,
    IpfsUploadService,
    LocalKeysService,
    OslMessagingService,
    NotificationsSocketService,
    PendingRequestsStore,
  ],
})
export class DomainModule {}
