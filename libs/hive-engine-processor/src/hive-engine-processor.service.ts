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

@Injectable()
export class HiveEngineProcessorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HiveEngineProcessorService.name);
  private running = true;

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
    const end = process.hrtime(start);
    this.logger.log(`${currentBlock}: ${end[1] / 1000000}ms`);
    await this.cache.setBlockNumber(currentBlock + 1);
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
