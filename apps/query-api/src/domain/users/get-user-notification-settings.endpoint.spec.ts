import { ForbiddenException } from '@nestjs/common';
import type { UserNotificationSettingsRepository } from '../../repositories/user-notification-settings.repository';
import { GetUserNotificationSettingsEndpoint } from './get-user-notification-settings.endpoint';

describe('GetUserNotificationSettingsEndpoint', () => {
  const settingsRepository = {
    findByAccount: jest.fn(),
  } as unknown as UserNotificationSettingsRepository;

  let endpoint: GetUserNotificationSettingsEndpoint;

  beforeEach(() => {
    jest.clearAllMocks();
    endpoint = new GetUserNotificationSettingsEndpoint(settingsRepository);
  });

  it('returns defaults when row is missing', async () => {
    (settingsRepository.findByAccount as jest.Mock).mockResolvedValue(null);
    const result = await endpoint.execute('alice', 'alice');
    expect(result.follow).toBe(true);
    expect(result.my_post).toBe(false);
    expect(result.downvote).toBe(false);
  });

  it('forbids when viewer does not match account', async () => {
    await expect(endpoint.execute('alice', 'bob')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('maps stored row', async () => {
    (settingsRepository.findByAccount as jest.Mock).mockResolvedValue({
      account: 'alice',
      deactivation_campaign: true,
      follow: false,
      reblog: true,
      reply: true,
      mention: true,
      minimal_transfer: 1,
      transfer: true,
      power_up: true,
      witness_vote: true,
      my_post: false,
      my_comment: false,
      my_like: false,
      vote: true,
      downvote: false,
      claim_reward: false,
      fill_order: true,
      claimed_object_updates: true,
      group_id_control: true,
      followed_user_threads: true,
      messages: true,
      obl: true,
    });
    const result = await endpoint.execute('alice', 'alice');
    expect(result.follow).toBe(false);
    expect(result).not.toHaveProperty('deactivation_campaign');
    expect(result).not.toHaveProperty('account');
  });
});
