import { Module } from '@nestjs/common';

import { HiveMainParser } from './hive-main-parser';
import { HiveCustomJsonParserModule } from './hive-custom-json-parser.module';
import { HiveCommentParserModule } from '../hive-comment/hive-comment-parser.module';
import { BLOCK_PARSER } from '@opden-data-layer/core';

@Module({
  imports: [HiveCustomJsonParserModule, HiveCommentParserModule],
  providers: [
    HiveMainParser,
    { provide: BLOCK_PARSER, useExisting: HiveMainParser },
  ],
  exports: [BLOCK_PARSER],
})
export class HiveParserProvidersModule {}
