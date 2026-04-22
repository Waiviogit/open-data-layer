import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CanonicalRecomputeRepository } from '../../repositories/canonical-recompute.repository';
import { SiteCanonicalService } from './site-canonical.service';

const INTERVAL = 'siteCanonicalRecompute';

@Injectable()
export class SiteCanonicalWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SiteCanonicalWorker.name);
  private id: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
    private readonly queueRepository: CanonicalRecomputeRepository,
    private readonly siteCanonicalService: SiteCanonicalService,
  ) {}

  onModuleInit(): void {
    const ms = this.config.get<number>(
      'siteCanonical.recomputeIntervalMs',
      2_000,
    );
    const every = Math.max(500, ms);
    this.id = setInterval(() => {
      void this.runBatch();
    }, every);
    this.registry.addInterval(INTERVAL, this.id);
  }

  onModuleDestroy(): void {
    if (this.id) {
      try {
        this.registry.deleteInterval(INTERVAL);
      } catch {
        // ignore
      }
      clearInterval(this.id);
    }
  }

  private async runBatch(): Promise<void> {
    const batch = this.config.get<number>(
      'siteCanonical.recomputeBatchSize',
      5,
    );
    const limit = Math.max(1, batch);
    const ids = await this.queueRepository.claimObjectIds(limit);
    for (const objectId of ids) {
      try {
        await this.siteCanonicalService.recomputeForObject(objectId);
      } catch (e) {
        this.logger.error(
          `site canonical recompute for ${objectId}: ${(e as Error).message}`,
        );
      }
    }
  }
}
