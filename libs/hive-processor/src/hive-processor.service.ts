import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { setTimeout } from 'node:timers/promises';
import { HiveClient } from '@opden-data-layer/clients';
import { BlockCacheService } from './block-cache.service';
import { BLOCK_PARSER } from './hive-processor.options';
import type { BlockParserInterface } from './hive-processor.options';

@Injectable()
export class HiveProcessorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HiveProcessorService.name);
  private running = true;

  constructor(
    private readonly hiveClient: HiveClient,
    private readonly cache: BlockCacheService,
    @Inject(BLOCK_PARSER) private readonly blockParser: BlockParserInterface,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Hive Blockchain parser started');
    void this.loop();
  }

  async loop() {
    while (this.running) {
      try {
        await this.parseNextBlock();
      } catch (e) {
        this.logger.error(e);
        await this.sleep(2000);
      }
    }
  }

  async parseNextBlock() {
    const currentBlock = await this.cache.getBlockNumber();
    const start = process.hrtime();
    await this.processBlock(currentBlock);
    const end = process.hrtime(start);
    this.logger.log(`${currentBlock}: ${end[1] / 1000000}ms`);
    await this.cache.setBlockNumber(currentBlock + 1);
  }

  async processBlock(currentBlock: number) {
    const block = await this.hiveClient.getBlock(currentBlock);
    if (block && (!block.transactions || !block.transactions[0])) {
      this.logger.log(`EMPTY BLOCK: ${currentBlock}`);
      return;
    }
    if (block && block.transactions && block.transactions[0]) {
      await this.blockParser.parseBlock(block);
      return;
    }
    throw new Error(`Unable to fetch block ${currentBlock}`);
  }

  stop() {
    this.running = false;
  }

  async sleep(ms: number) {
    await setTimeout(ms);
  }
}
