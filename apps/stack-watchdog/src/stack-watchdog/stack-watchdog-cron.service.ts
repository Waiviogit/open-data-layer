import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppsStackSyncService } from './apps-stack-sync.service';
import { DockerImagePruneService } from './docker-image-prune.service';
import { DOCKER_IMAGE_PRUNE_CRON } from './stack-watchdog.constants';

@Injectable()
export class StackWatchdogCronService {
  private readonly logger = new Logger(StackWatchdogCronService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly sync: AppsStackSyncService,
    private readonly imagePrune: DockerImagePruneService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async onCron(): Promise<void> {
    const enabled = this.config.get<boolean>('stackWatchdog.enabled');
    if (!enabled) {
      return;
    }

    try {
      await this.sync.syncOnce();
    } catch {
      this.logger.warn(
        'Stack sync failed — will retry on next cron tick',
      );
    }
  }

  @Cron(DOCKER_IMAGE_PRUNE_CRON)
  async onDailyImagePrune(): Promise<void> {
    const enabled = this.config.get<boolean>('stackWatchdog.enabled');
    if (!enabled) {
      return;
    }

    try {
      await this.imagePrune.pruneUnusedImagesOnce();
    } catch {
      this.logger.warn(
        'Docker image prune failed — will retry on next scheduled run',
      );
    }
  }
}
