import { existsSync } from 'node:fs';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppsStackSyncService,
  posixInstallRoot,
} from './apps-stack-sync.service';
import { DockerComposeRunnerService } from './docker-compose-runner.service';
import { DockerImagePruneService } from './docker-image-prune.service';
import { StackWatchdogCronService } from './stack-watchdog-cron.service';

@Module({
  providers: [
    DockerComposeRunnerService,
    AppsStackSyncService,
    DockerImagePruneService,
    StackWatchdogCronService,
  ],
})
export class StackWatchdogModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const sw = this.config.get<{
      enabled: boolean;
      deployEnv: string;
      installDir: string;
    }>('stackWatchdog');

    if (!sw?.enabled) {
      return;
    }

    const root = posixInstallRoot(sw.installDir);
    const composePath = `${root}/docker-compose.${sw.deployEnv}.apps.yml`;
    const envPath = `${root}/.env`;

    if (!existsSync(composePath)) {
      throw new Error(
        `stack-watchdog: compose file not found: ${composePath} (check INSTALL_DIR and DEPLOY_ENV)`,
      );
    }
    if (!existsSync(envPath)) {
      throw new Error(
        `stack-watchdog: env file not found: ${envPath} (check INSTALL_DIR)`,
      );
    }
  }
}
