import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import maxmind, { type CityResponse, type Reader } from 'maxmind';
import { GEOIP_OPEN_RETRY_MS } from './geoip.constants';

@Injectable()
export class GeoipReaderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GeoipReaderService.name);
  private reader: Reader<CityResponse> | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private missingLogged = false;
  private destroyed = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.tryOpen();
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  get(ip: string): CityResponse | null {
    return this.reader?.get(ip) ?? null;
  }

  private async tryOpen(): Promise<void> {
    if (this.destroyed) {
      return;
    }
    const path = this.config.get<string | undefined>('geoip.dbPath');
    if (!path) {
      this.logger.log(
        'GeoIP database path is not configured; lookups disabled',
      );
      return;
    }
    try {
      this.reader = await maxmind.open<CityResponse>(path, {
        watchForUpdates: true,
        watchForUpdatesNonPersistent: true,
        watchForUpdatesHook: () => {
          this.logger.log('GeoIP database reloaded');
        },
      });
      this.logger.log(`GeoIP database loaded from ${path}`);
    } catch (e) {
      if (!this.missingLogged) {
        this.logger.warn(
          `GeoIP database unavailable: ${(e as Error).message}`,
        );
        this.missingLogged = true;
      }
      const timer = setTimeout(() => {
        this.retryTimer = null;
        void this.tryOpen();
      }, GEOIP_OPEN_RETRY_MS);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
      this.retryTimer = timer;
    }
  }
}
