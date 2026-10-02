import { blockTimestampToUnixSeconds } from '@opden-data-layer/core';

import type { HiveOperationHandlerContext } from '../hive-parser/hive-handler-context';
import { ReblogSocialService } from './reblog-social.service';

const context = {
  transaction: { transaction_id: 'trx-1' },
  timestamp: '2023-10-23T23:46:06',
  blockNum: 1,
  transactionIndex: 0,
  operationIndex: 0,
} as HiveOperationHandlerContext;

const payload = {
  kind: 'reblog' as const,
  account: 'grampo',
  author: 'cryptodive',
  permlink: 'add-products-in-a-click-waivio-chrome-extension',
};

describe('ReblogSocialService', () => {
  function createService(mocks: {
    findSourcePostForReblog?: jest.Mock;
    insertRebloggedUser?: jest.Mock;
    enqueue?: jest.Mock;
    upsertPending?: jest.Mock;
    ensureUserExists?: jest.Mock;
    emitWithContext?: jest.Mock;
  } = {}) {
    const findSourcePostForReblog =
      mocks.findSourcePostForReblog ?? jest.fn().mockResolvedValue(undefined);
    const insertRebloggedUser =
      mocks.insertRebloggedUser ?? jest.fn().mockResolvedValue(undefined);
    const enqueue = mocks.enqueue ?? jest.fn().mockResolvedValue(undefined);
    const upsertPending =
      mocks.upsertPending ?? jest.fn().mockResolvedValue(undefined);
    const ensureUserExists =
      mocks.ensureUserExists ?? jest.fn().mockResolvedValue(undefined);
    const emitWithContext = mocks.emitWithContext ?? jest.fn();

    const service = new ReblogSocialService(
      { findSourcePostForReblog, insertRebloggedUser } as never,
      { enqueue } as never,
      { upsert: upsertPending } as never,
      { ensureUserExists } as never,
      {
        emitWithContext,
        hiveContext: () => ({ blockNum: 1 }),
      } as never,
    );

    return {
      service,
      findSourcePostForReblog,
      insertRebloggedUser,
      enqueue,
      upsertPending,
      ensureUserExists,
      emitWithContext,
    };
  }

  it('writes pending with block time and enqueues when the source post is missing', async () => {
    const { service, upsertPending, enqueue, insertRebloggedUser, emitWithContext } =
      createService();

    await service.applyReblogFromFollowPayload(payload, context);

    const blockUnix = blockTimestampToUnixSeconds(context.timestamp);
    expect(upsertPending).toHaveBeenCalledWith({
      author: payload.author,
      permlink: payload.permlink,
      account: payload.account,
      reblogged_at_unix: blockUnix,
    });
    expect(enqueue).toHaveBeenCalledWith(
      payload.author,
      payload.permlink,
      blockUnix,
      true,
    );
    expect(insertRebloggedUser).not.toHaveBeenCalled();
    expect(emitWithContext).not.toHaveBeenCalled();
  });

  it('inserts the reblog and notifies when the source post exists', async () => {
    const { service, insertRebloggedUser, enqueue, upsertPending, emitWithContext } =
      createService({
        findSourcePostForReblog: jest.fn().mockResolvedValue({
          author: 'cryptodive',
          permlink: payload.permlink,
          title: 'Chrome',
        }),
      });

    await service.applyReblogFromFollowPayload(payload, context);

    expect(insertRebloggedUser).toHaveBeenCalledWith({
      author: 'cryptodive',
      permlink: payload.permlink,
      account: 'grampo',
      reblogged_at_unix: blockTimestampToUnixSeconds(context.timestamp),
    });
    expect(enqueue).not.toHaveBeenCalled();
    expect(upsertPending).not.toHaveBeenCalled();
    expect(emitWithContext).toHaveBeenCalledTimes(2);
  });

  it('skips a self-reblog', async () => {
    const { service, insertRebloggedUser, enqueue, upsertPending } = createService();

    await service.applyReblogFromFollowPayload(
      { ...payload, account: 'cryptodive' },
      context,
    );

    expect(insertRebloggedUser).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
    expect(upsertPending).not.toHaveBeenCalled();
  });
});
