import { Module } from '@nestjs/common';
import { HiveCustomJsonParser } from './hive-custom-json-parser';
import { RepositoriesModule } from '../../repositories';

@Module({
  imports: [RepositoriesModule],
  providers: [HiveCustomJsonParser],
  exports: [HiveCustomJsonParser],
})
export class HiveCustomJsonParserModule {}
