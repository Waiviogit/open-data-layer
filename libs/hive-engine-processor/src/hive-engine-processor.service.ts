import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { setTimeout } from 'node:timers/promises';
import { HiveEngineClient } from '@opden-data-layer/clients';
import { BlockCacheService } from './block-cache.service';
import { HIVE_ENGINE_BLOCK_PARSER } from './hive-engine-processor.options';
import type { HiveEngineBlockParserInterface } from './hive-engine-processor.options';

const LOG_EVERY_N_BLOCKS = 10;

@Injectable()
export class HiveEngineProcessorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HiveEngineProcessorService.name);
  private running = true;
  private blockTimesMs: number[] = [];

  constructor(
    private readonly hiveEngineClient: HiveEngineClient,
    private readonly cache: BlockCacheService,
    @Inject(HIVE_ENGINE_BLOCK_PARSER)
    private readonly blockParser: HiveEngineBlockParserInterface,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Hive Engine blockchain parser started');
    void this.loop();
  }

  async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.parseNextBlock();
      } catch (e) {
        this.logger.error(e);
        await this.sleep(2000);
      }
    }
  }

  async parseNextBlock(): Promise<void> {
    const currentBlock = await this.cache.getBlockNumber();
    const start = process.hrtime();
    await this.processBlock(currentBlock);
    const [, ns] = process.hrtime(start);
    this.recordBlockTime(currentBlock, ns / 1_000_000);
    await this.cache.setBlockNumber(currentBlock + 1);
  }

  private recordBlockTime(blockNumber: number, elapsedMs: number): void {
    this.blockTimesMs.push(elapsedMs);
    if (this.blockTimesMs.length >= LOG_EVERY_N_BLOCKS) {
      const avg =
        this.blockTimesMs.reduce((sum, t) => sum + t, 0) /
        this.blockTimesMs.length;
      this.logger.log(
        `block ${blockNumber} | avg ${avg.toFixed(2)}ms over last ${this.blockTimesMs.length} blocks`,
      );
      this.blockTimesMs = [];
    }
  }

  async processBlock(currentBlock: number): Promise<void> {
    const block = await this.hiveEngineClient.getBlockInfo(currentBlock);
    if (!block) {
      throw new Error(`Unable to fetch block ${currentBlock}`);
    }
    if (block.transactions.length === 0) {
      this.logger.log(`EMPTY BLOCK: ${currentBlock}`);
      return;
    }
    await this.blockParser.parseBlock(block);
  }

  stop(): void {
    this.running = false;
  }

  async sleep(ms: number): Promise<void> {
    await setTimeout(ms);
  }
}
