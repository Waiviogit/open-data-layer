import { Module } from '@nestjs/common';
import { GeoipLookupService } from './geoip-lookup.service';
import { GeoipReaderService } from './geoip-reader.service';

@Module({
  providers: [GeoipReaderService, GeoipLookupService],
  exports: [GeoipLookupService],
})
export class GeoipModule {}
