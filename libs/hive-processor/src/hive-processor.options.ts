import { SignedBlock } from '@hiveio/dhive/lib/chain/block';

export interface HiveProcessorModuleOptions {
  blockNumberKey: string;
  startBlockNumber: number;
  redisDb?: number;
}

export interface BlockParserInterface {
  parseBlock(block: SignedBlock): Promise<void>;
}

export const HIVE_PROCESSOR_OPTIONS = 'HIVE_PROCESSOR_OPTIONS';
export const BLOCK_PARSER = 'BLOCK_PARSER';
