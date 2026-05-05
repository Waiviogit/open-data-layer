import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  HIVE_ENGINE_BLOCK_PARSER,
  HiveEngineProcessorModule,
} from '@opden-data-layer/hive-engine-processor';
import { HiveEngineCompositeParser } from './hive-engine-composite.parser';
import {
  HIVE_ENGINE_SUB_PARSERS,
  type HiveEngineSubParser,
} from './hive-engine-sub-parser.interface';
import { WaivStakeParser } from './parsers/waiv-stake.parser';

/**
 * Wires the Hive Engine block-processor loop with a composite parser.
 *
 * All sub-parsers and the composite dispatcher are registered as
 * `extraProviders` inside `HiveEngineProcessorModule` so that
 * `HIVE_ENGINE_BLOCK_PARSER` is resolvable within that module's DI context.
 *
 * To add a new parser:
 *   1. Create a class implementing `HiveEngineSubParser` in `parsers/`.
 *   2. Add it to the `subParsers` array below.
 *   3. No other changes needed.
 */
@Module({
  imports: [
    HiveEngineProcessorModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const he = config.get<{
          blockNumberKey: string;
          startBlockNumber: number;
        }>('hiveEngine');
        if (!he) {
          throw new Error('HiveEngineParserModule: hiveEngine config is missing');
        }
        return {
          blockNumberKey: he.blockNumberKey,
          startBlockNumber: he.startBlockNumber,
          redisDb: 0,
        };
      },
      inject: [ConfigService],
      extraProviders: [
        // ── sub-parsers ────────────────────────────────────────────────────
        // Add new parsers here and append them to the inject array below.
        WaivStakeParser,
        {
          provide: HIVE_ENGINE_SUB_PARSERS,
          useFactory: (...parsers: HiveEngineSubParser[]) => parsers,
          inject: [WaivStakeParser],
        },

        // ── composite dispatcher ───────────────────────────────────────────
        HiveEngineCompositeParser,
        { provide: HIVE_ENGINE_BLOCK_PARSER, useExisting: HiveEngineCompositeParser },
      ],
    }),
  ],
})
export class HiveEngineParserModule {}
