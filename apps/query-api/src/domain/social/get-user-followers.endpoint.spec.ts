import { AccountsCurrentRepository, UserSubscriptionsRepository } from '../../repositories';
import type { UserSocialListQuery } from './user-social-list.schema';
import { GetUserFollowersEndpoint } from './get-user-followers.endpoint';

describe('GetUserFollowersEndpoint', () => {
  const query: UserSocialListQuery = { sort: 'recency', skip: 0, limit: 10 };

  it('returns null when profile account is missing', async () => {
    const accounts = { findByName: jest.fn().mockResolvedValue(null) } as unknown as AccountsCurrentRepository;
    const subs = {} as unknown as UserSubscriptionsRepository;
    const endpoint = new GetUserFollowersEndpoint(accounts, subs);

    await expect(endpoint.execute('  ', query, undefined)).resolves.toBeNull();
    expect(accounts.findByName).not.toHaveBeenCalled();

    await expect(endpoint.execute('alice', query, undefined)).resolves.toBeNull();
    expect(accounts.findByName).toHaveBeenCalledWith('alice');
  });

  it('returns paginated followers and isCurrentFollowing for viewer', async () => {
    const accounts = {
      findByName: jest.fn().mockResolvedValue({ name: 'alice' }),
    } as unknown as AccountsCurrentRepository;

    const subs = {
      countFollowersOf: jest.fn().mockResolvedValue(2),
      findFollowersOf: jest.fn().mockResolvedValue([
        {
          name: 'bob',
          profile_image: null,
          wobjects_weight: 9.1,
          users_following_count: 4,
        },
        {
          name: 'carol',
          profile_image: 'https://x/ava.png',
          wobjects_weight: 0,
          users_following_count: 100,
        },
      ]),
      listFollowedSubset: jest.fn().mockResolvedValue(['bob']),
    } as unknown as UserSubscriptionsRepository;

    const endpoint = new GetUserFollowersEndpoint(accounts, subs);
    const result = await endpoint.execute('alice', query, 'me');

    expect(result).toEqual({
      items: [
        {
          name: 'bob',
          avatarUrl: null,
          wobjectsWeight: 9.1,
          usersFollowingCount: 4,
          isCurrentFollowing: true,
        },
        {
          name: 'carol',
          avatarUrl: 'https://x/ava.png',
          wobjectsWeight: 0,
          usersFollowingCount: 100,
          isCurrentFollowing: false,
        },
      ],
      total: 2,
      hasMore: false,
    });
    expect(subs.listFollowedSubset).toHaveBeenCalledWith('me', ['bob', 'carol']);
  });

  it('sets hasMore when more rows exist beyond the page', async () => {
    const accounts = {
      findByName: jest.fn().mockResolvedValue({ name: 'alice' }),
    } as unknown as AccountsCurrentRepository;
    const subs = {
      countFollowersOf: jest.fn().mockResolvedValue(30),
      findFollowersOf: jest.fn().mockResolvedValue([
        { name: 'b', profile_image: null, wobjects_weight: 0, users_following_count: 0 },
      ]),
      listFollowedSubset: jest.fn().mockResolvedValue([]),
    } as unknown as UserSubscriptionsRepository;

    const endpoint = new GetUserFollowersEndpoint(accounts, subs);
    const result = await endpoint.execute('alice', { ...query, skip: 0, limit: 1 }, undefined);

    expect(result?.hasMore).toBe(true);
    expect(result?.total).toBe(30);
  });
});
