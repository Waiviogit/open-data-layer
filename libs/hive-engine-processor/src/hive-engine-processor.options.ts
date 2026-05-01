import type { HiveEngineBlock } from '@opden-data-layer/clients';

export interface HiveEngineProcessorModuleOptions {
  blockNumberKey: string;
  startBlockNumber: number;
  redisDb?: number;
}

export interface HiveEngineBlockParserInterface {
  parseBlock(block: HiveEngineBlock): Promise<void>;
}

export const HIVE_ENGINE_PROCESSOR_OPTIONS =
  'HIVE_ENGINE_PROCESSOR_OPTIONS';
export const HIVE_ENGINE_BLOCK_PARSER = 'HIVE_ENGINE_BLOCK_PARSER';
