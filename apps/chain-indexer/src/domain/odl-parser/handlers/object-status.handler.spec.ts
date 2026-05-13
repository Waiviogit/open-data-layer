import { Logger } from '@nestjs/common';
import { ObjectStatusHandler } from './object-status.handler';
import { ObjectStatusCreatedEvent } from '../object-status-created.event';

describe('ObjectStatusHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('updates objects_core when signer is a platform admin', async () => {
    const governanceCacheService = {
      resolvePlatform: jest.fn().mockResolvedValue({ admins: ['admin1'] }),
    };
    const update = jest.fn().mockResolvedValue(undefined);
    const handler = new ObjectStatusHandler(
      governanceCacheService as never,
      { update } as never,
    );

    await handler.handleObjectStatusCreated(
      new ObjectStatusCreatedEvent('o1', 'admin1', 'unavailable'),
    );

    expect(governanceCacheService.resolvePlatform).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('o1', { status: 'unavailable' });
  });

  it('skips update when signer is not a platform admin', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const governanceCacheService = {
      resolvePlatform: jest.fn().mockResolvedValue({ admins: ['admin1'] }),
    };
    const update = jest.fn();
    const handler = new ObjectStatusHandler(
      governanceCacheService as never,
      { update } as never,
    );

    await handler.handleObjectStatusCreated(
      new ObjectStatusCreatedEvent('o1', 'intruder', 'unavailable'),
    );

    expect(update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('UNAUTHORIZED_STATUS_UPDATE'),
    );
  });

  it('skips update when governance admins list is empty', async () => {
    const governanceCacheService = {
      resolvePlatform: jest.fn().mockResolvedValue({ admins: [] }),
    };
    const update = jest.fn();
    const handler = new ObjectStatusHandler(
      governanceCacheService as never,
      { update } as never,
    );

    await handler.handleObjectStatusCreated(
      new ObjectStatusCreatedEvent('o1', 'anyone', 'flagged'),
    );

    expect(update).not.toHaveBeenCalled();
  });
});
