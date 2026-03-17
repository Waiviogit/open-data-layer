import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisClientFactory, RedisClientInterface } from '@opden-data-layer/clients';
import { HIVE_PROCESSOR_OPTIONS } from './hive-processor.options';
import type { HiveProcessorModuleOptions } from './hive-processor.options';

@Injectable()
export class BlockCacheService {
  private readonly logger = new Logger(BlockCacheService.name);
  private readonly client: RedisClientInterface;
  private readonly blockNumberKey: string;
  private readonly defaultStartBlockNumber: number;

  constructor(
    @Inject(HIVE_PROCESSOR_OPTIONS) options: HiveProcessorModuleOptions,
    redisFactory: RedisClientFactory,
  ) {
    this.client = redisFactory.getClient(options.redisDb ?? 0);
    this.blockNumberKey = options.blockNumberKey;
    this.defaultStartBlockNumber = options.startBlockNumber;
  }

  async getBlockNumber(): Promise<number> {
    try {
      const cached = await this.client.get(this.blockNumberKey);
      return cached ? parseInt(cached) : this.defaultStartBlockNumber;
    } catch (error) {
      this.logger.error(`Error getting block number from cache: ${error}`);
      return this.defaultStartBlockNumber;
    }
  }

  async setBlockNumber(blockNumber: number): Promise<void> {
    try {
      await this.client.set(this.blockNumberKey, blockNumber.toString());
    } catch (error) {
      this.logger.error(`Error setting block number to cache: ${error}`);
    }
  }
}
