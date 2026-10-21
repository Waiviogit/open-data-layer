import { Module } from '@nestjs/common';
import { CountryResolverService } from './country-resolver.service';
import { GeoipLookupService } from './geoip-lookup.service';
import { GeoipReaderService } from './geoip-reader.service';

@Module({
  providers: [GeoipReaderService, GeoipLookupService, CountryResolverService],
  exports: [GeoipLookupService, CountryResolverService],
})
export class GeoipModule {}
