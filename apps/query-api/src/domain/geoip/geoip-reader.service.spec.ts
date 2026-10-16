import { ConfigService } from '@nestjs/config';
import maxmind, { type CityResponse, type Reader } from 'maxmind';
import { GEOIP_OPEN_RETRY_MS } from './geoip.constants';
import { GeoipReaderService } from './geoip-reader.service';

jest.mock('maxmind', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
  },
}));

const openMock = maxmind.open as jest.MockedFunction<typeof maxmind.open>;

describe('GeoipReaderService', () => {
  function configWith(path: string | undefined): ConfigService {
    return {
      get: jest.fn((key: string) =>
        key === 'geoip.dbPath' ? path : undefined,
      ),
    } as unknown as ConfigService;
  }

  afterEach(() => {
    jest.useRealTimers();
    openMock.mockReset();
  });

  it('stays disabled when dbPath is unset', async () => {
    const service = new GeoipReaderService(configWith(undefined));
    await service.onModuleInit();
    expect(openMock).not.toHaveBeenCalled();
    expect(service.get('8.8.8.8')).toBeNull();
  });

  it('retries a failed open until success', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    const reader = {
      get: jest.fn().mockReturnValue({ country: { iso_code: 'US' } }),
    } as unknown as Reader<CityResponse>;
    openMock
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce(reader);

    const service = new GeoipReaderService(configWith('/tmp/db.mmdb'));
    await service.onModuleInit();
    expect(service.get('8.8.8.8')).toBeNull();
    expect(openMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(30_000);
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(service.get('8.8.8.8')).toBeNull();

    await jest.advanceTimersByTimeAsync(GEOIP_OPEN_RETRY_MS);
    expect(openMock).toHaveBeenCalledTimes(2);
    expect(service.get('8.8.8.8')).toEqual({ country: { iso_code: 'US' } });
  });

  it('cancels a pending open retry on destroy', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    openMock.mockRejectedValue(new Error('ENOENT'));

    const service = new GeoipReaderService(configWith('/tmp/db.mmdb'));
    await service.onModuleInit();
    expect(openMock).toHaveBeenCalledTimes(1);

    service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(GEOIP_OPEN_RETRY_MS * 2);
    expect(openMock).toHaveBeenCalledTimes(1);
  });
});
