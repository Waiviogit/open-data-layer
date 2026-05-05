import type { HiveEngineBlock } from '@opden-data-layer/clients';

/**
 * Interface every Hive Engine sub-parser must implement.
 * Sub-parsers are registered with `HIVE_ENGINE_SUB_PARSERS` multi-token
 * and called for every block by {@link HiveEngineCompositeParser}.
 */
export interface HiveEngineSubParser {
  parseBlock(block: HiveEngineBlock): Promise<void>;
}

export const HIVE_ENGINE_SUB_PARSERS = 'HIVE_ENGINE_SUB_PARSERS';
