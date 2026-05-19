import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { SubscriptionService } from './subscription.service';
import { wsSendJson } from './ws-message';

jest.mock('./ws-message', () => ({
  wsSendJson: jest.fn(),
}));

describe('SubscriptionService', () => {
  const config = {
    get: jest.fn(() => ({ ttlSeconds: 300 })),
  } as unknown as ConfigService;

  let service: SubscriptionService;
  const client = {} as WebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionService(config);
  });

  it('notifyTrxProcessed includes correlationId and clears subscription', () => {
    service.subscribe('trx-1', client, 'corr-abc');

    service.notifyTrxProcessed('trx-1', { blockNum: 42 });

    expect(wsSendJson).toHaveBeenCalledWith(
      client,
      'trx_processed',
      expect.objectContaining({
        trxId: 'trx-1',
        correlationId: 'corr-abc',
        blockNum: 42,
      }),
    );

    service.notifyTrxProcessed('trx-1', { blockNum: 99 });
    expect(wsSendJson).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe removes client before notify', () => {
    service.subscribe('trx-2', client, 'corr-2');
    service.unsubscribe('trx-2', client);

    service.notifyTrxProcessed('trx-2', {});

    expect(wsSendJson).not.toHaveBeenCalled();
  });
});
