import { Module } from '@nestjs/common';
import { OdlParserModule } from '../odl-parser/odl-parser.module';
import { HiveSocialModule } from '../hive-social/hive-social.module';
import { HiveCustomJsonParser } from './hive-custom-json-parser';

@Module({
  imports: [OdlParserModule, HiveSocialModule],
  providers: [HiveCustomJsonParser],
  exports: [HiveCustomJsonParser],
})
export class HiveCustomJsonParserModule {}
