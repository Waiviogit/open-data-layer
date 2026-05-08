import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppsStackSyncService } from './apps-stack-sync.service';

@Injectable()
export class StackWatchdogCronService {
  private readonly logger = new Logger(StackWatchdogCronService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly sync: AppsStackSyncService,
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
}
