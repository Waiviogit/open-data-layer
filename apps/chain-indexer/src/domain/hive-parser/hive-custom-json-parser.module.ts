import { Module } from '@nestjs/common';
import { OdlParserModule } from '../odl-parser/odl-parser.module';
import { HiveCustomJsonParser } from './hive-custom-json-parser';

@Module({
  imports: [OdlParserModule],
  providers: [HiveCustomJsonParser],
  exports: [HiveCustomJsonParser],
})
export class HiveCustomJsonParserModule {}
