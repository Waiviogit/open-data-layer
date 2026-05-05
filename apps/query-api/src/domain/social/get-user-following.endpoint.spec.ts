import { AccountsCurrentRepository, UserSubscriptionsRepository } from '../../repositories';
import type { UserSocialListQuery } from './user-social-list.schema';
import { GetUserFollowingEndpoint } from './get-user-following.endpoint';

describe('GetUserFollowingEndpoint', () => {
  const query: UserSocialListQuery = { sort: 'a-z', skip: 0, limit: 20 };

  it('returns null when profile is missing', async () => {
    const accounts = { findByName: jest.fn().mockResolvedValue(null) } as unknown as AccountsCurrentRepository;
    const subs = {} as unknown as UserSubscriptionsRepository;
    const endpoint = new GetUserFollowingEndpoint(accounts, subs);

    await expect(endpoint.execute('nobody', query, undefined)).resolves.toBeNull();
  });

  it('returns accounts the profile follows', async () => {
    const accounts = {
      findByName: jest.fn().mockResolvedValue({ name: 'alice' }),
    } as unknown as AccountsCurrentRepository;
    const subs = {
      countFollowingBy: jest.fn().mockResolvedValue(1),
      findAccountsFollowedBy: jest.fn().mockResolvedValue([
        {
          name: 'zeb',
          profile_image: null,
          wobjects_weight: 1,
          users_following_count: 2,
        },
      ]),
      listFollowedSubset: jest.fn().mockResolvedValue(['zeb']),
    } as unknown as UserSubscriptionsRepository;

    const endpoint = new GetUserFollowingEndpoint(accounts, subs);
    const result = await endpoint.execute('alice', query, 'alice');

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.isCurrentFollowing).toBe(true);
    expect(subs.listFollowedSubset).toHaveBeenCalledWith('alice', ['zeb']);
  });
});
