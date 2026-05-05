import { Inject, Injectable, Logger } from '@nestjs/common';
import type { HiveEngineBlock } from '@opden-data-layer/clients';
import type { HiveEngineBlockParserInterface } from '@opden-data-layer/hive-engine-processor';
import {
  HIVE_ENGINE_SUB_PARSERS,
  type HiveEngineSubParser,
} from './hive-engine-sub-parser.interface';

/**
 * Composite block parser: dispatches each block to all registered sub-parsers.
 * Add new sub-parsers by registering them under the `HIVE_ENGINE_SUB_PARSERS`
 * multi-provider token — no changes to this class needed.
 */
@Injectable()
export class HiveEngineCompositeParser implements HiveEngineBlockParserInterface {
  private readonly logger = new Logger(HiveEngineCompositeParser.name);

  constructor(
    @Inject(HIVE_ENGINE_SUB_PARSERS)
    private readonly parsers: HiveEngineSubParser[],
  ) {}

  async parseBlock(block: HiveEngineBlock): Promise<void> {
    for (const parser of this.parsers) {
      try {
        await parser.parseBlock(block);
      } catch (e) {
        this.logger.error(
          `${parser.constructor.name} failed on block ${block.blockNumber}: ${(e as Error).message}`,
        );
      }
    }
  }
}
