import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CurrencyCollectService } from '@opden-data-layer/currency';

import type { JobHandlerContext } from './cron-job.types';

let runnerRef: CurrencyCollectRunner | null = null;

function registerCurrencyCollectRunner(r: CurrencyCollectRunner): void {
  runnerRef = r;
}

export function getCurrencyCollectRunner(): CurrencyCollectRunner {
  if (!runnerRef) {
    throw new Error('CurrencyCollectRunner is not registered yet');
  }
  return runnerRef;
}

@Injectable()
export class CurrencyCollectRunner implements OnModuleInit {
  private readonly logger = new Logger(CurrencyCollectRunner.name);

  constructor(private readonly collect: CurrencyCollectService) {}

  onModuleInit(): void {
    registerCurrencyCollectRunner(this);
  }

  async coinGeckoOrdinary(ctx: JobHandlerContext): Promise<void> {
    await this.safeRun(ctx, () =>
      this.collect.collectCoinGeckoOrdinary(ctx.signal),
    );
  }

  async hiveEngineOrdinary(ctx: JobHandlerContext): Promise<void> {
    await this.safeRun(ctx, () =>
      this.collect.collectHiveEngineOrdinary(ctx.signal),
    );
  }

  async coinGeckoDaily(ctx: JobHandlerContext): Promise<void> {
    await this.safeRun(ctx, () =>
      this.collect.collectCoinGeckoDaily(ctx.signal),
    );
  }

  async fxDaily(ctx: JobHandlerContext): Promise<void> {
    await this.safeRun(ctx, () =>
      this.collect.collectFxRatesDaily(ctx.signal),
    );
  }

  async hiveEngineDaily(ctx: JobHandlerContext): Promise<void> {
    await this.safeRun(ctx, () =>
      this.collect.collectHiveEngineDaily(ctx.signal),
    );
  }

  private async safeRun(
    ctx: JobHandlerContext,
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      await fn();
    } catch (e) {
      const msg =
        e instanceof Error ? `${e.message} ${e.stack ?? ''}` : String(e);
      this.logger.error(`${ctx.jobName} ${ctx.runId}: ${msg}`);
      throw e;
    }
  }
}
