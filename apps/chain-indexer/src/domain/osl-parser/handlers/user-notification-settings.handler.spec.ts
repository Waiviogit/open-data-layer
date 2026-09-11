import type { OdlEventContext } from '../../odl-shared';
import { UserNotificationSettingsHandler } from './user-notification-settings.handler';

const baseCtx: OdlEventContext = {
  action: 'update_user_notification_settings',
  creator: 'alice',
  blockNum: 10,
  transactionIndex: 0,
  operationIndex: 0,
  odlEventIndex: 0,
  transactionId: 'hive-trx-abc',
  timestamp: '2026-01-01T00:00:00.000Z',
  eventSeq: BigInt(1),
  eventIdIndexMap: new Map(),
};

const validPayload = {
  follow: true,
  reblog: true,
  reply: true,
  mention: true,
  vote: true,
  downvote: false,
  claimed_object_updates: true,
  group_id_control: true,
  followed_user_threads: true,
  transfer: true,
  fill_order: true,
  power_up: true,
  claim_reward: false,
  witness_vote: true,
  my_post: false,
  my_comment: false,
  my_like: false,
  minimal_transfer: 0,
  messages: true,
  obl: true,
};

describe('UserNotificationSettingsHandler', () => {
  function createHandler(mocks: { upsert?: jest.Mock }) {
    const settingsRepository = {
      upsert: mocks.upsert ?? jest.fn().mockResolvedValue(undefined),
    };
    const handler = new UserNotificationSettingsHandler(
      settingsRepository as never,
    );
    return { handler, settingsRepository };
  }

  it('upserts settings on valid payload', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const { handler } = createHandler({ upsert });

    await handler.handle(validPayload, baseCtx);

    expect(upsert).toHaveBeenCalledWith('alice', validPayload);
  });

  it('ignores invalid payload', async () => {
    const upsert = jest.fn();
    const { handler } = createHandler({ upsert });

    await handler.handle({ follow: 'yes' }, baseCtx);

    expect(upsert).not.toHaveBeenCalled();
  });
});
