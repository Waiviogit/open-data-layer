import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetChannelByIdEndpoint } from './get-channel-by-id.endpoint';
import type { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import type { MessagingRepository } from '../../repositories/messaging.repository';

describe('GetChannelByIdEndpoint', () => {
  const groupChannel = {
    channel_id: 'grp-1',
    kind: 'group',
    creator: 'alice',
    title: 'Team',
    image: null,
    object_id: null,
    pair_hash: null,
    access: 'members_only',
    last_message_at_unix: null,
    dissolved_at_unix: null,
    created_at_unix: 1,
    event_seq: BigInt(1),
    transaction_id: 'tx-0',
  };

  const objectChannel = {
    ...groupChannel,
    channel_id: 'obj-ch-1',
    kind: 'object',
    title: 'Object chat',
    object_id: 'obj-1',
    access: 'public_read',
  };

  function makeEndpoint(
    messaging: Partial<MessagingRepository>,
    findByNames: jest.Mock = jest.fn().mockResolvedValue([]),
  ) {
    const repo = {
      findChannelById: jest.fn(),
      listMembers: jest.fn(),
      isMember: jest.fn(),
      ...messaging,
    } as unknown as MessagingRepository;
    const accounts = { findByNames } as unknown as AccountsCurrentRepository;
    return { endpoint: new GetChannelByIdEndpoint(repo, accounts), repo, accounts };
  }

  it('returns null when channel not found', async () => {
    const { endpoint } = makeEndpoint({
      findChannelById: jest.fn().mockResolvedValue(undefined),
    });

    await expect(endpoint.execute('missing', 'alice')).resolves.toBeNull();
  });

  it('throws when channel is dissolved', async () => {
    const { endpoint } = makeEndpoint({
      findChannelById: jest.fn().mockResolvedValue({
        ...groupChannel,
        dissolved_at_unix: 999,
      }),
    });

    await expect(endpoint.execute('grp-1', 'alice')).rejects.toThrow(NotFoundException);
  });

  it('loads members for group channels', async () => {
    const members = [
      {
        channel_id: 'grp-1',
        account: 'alice',
        role: 'admin',
        joined_at_unix: 1,
        last_read_at_unix: null,
      },
    ];
    const { endpoint, repo } = makeEndpoint({
      findChannelById: jest.fn().mockResolvedValue(groupChannel),
      listMembers: jest.fn().mockResolvedValue(members),
      isMember: jest.fn().mockResolvedValue(true),
    });

    const result = await endpoint.execute('grp-1', 'alice');

    expect(repo.listMembers).toHaveBeenCalledWith('grp-1');
    expect(result?.members).toEqual([{ account: 'alice', role: 'admin', avatar_url: null }]);
    expect(result?.viewer_role).toBe('admin');
  });

  it('attaches Hive metadata avatars to members', async () => {
    const members = [
      {
        channel_id: 'grp-1',
        account: 'alice',
        role: 'admin',
        joined_at_unix: 1,
        last_read_at_unix: null,
      },
      {
        channel_id: 'grp-1',
        account: 'bob',
        role: 'member',
        joined_at_unix: 2,
        last_read_at_unix: null,
      },
    ];
    const findByNames = jest.fn().mockResolvedValue([
      {
        name: 'bob',
        posting_json_metadata: JSON.stringify({
          profile: { profile_image: 'https://img.test/bob.jpg' },
        }),
        json_metadata: null,
        profile_image: null,
      },
    ]);
    const { endpoint, accounts } = makeEndpoint(
      {
        findChannelById: jest.fn().mockResolvedValue(groupChannel),
        listMembers: jest.fn().mockResolvedValue(members),
        isMember: jest.fn().mockResolvedValue(true),
      },
      findByNames,
    );

    const result = await endpoint.execute('grp-1', 'alice');

    expect(accounts.findByNames).toHaveBeenCalledWith(['alice', 'bob']);
    expect(result?.members).toEqual([
      { account: 'alice', role: 'admin', avatar_url: null },
      { account: 'bob', role: 'member', avatar_url: 'https://img.test/bob.jpg' },
    ]);
  });

  it('resolves posting metadata avatars when member case differs from accounts_current.name', async () => {
    const avatar =
      'https://waiviodev.com/ipfs-gateway/content/image/QmTA4vQkq4ZW5B1f8KXNPqCHt8ZD3CTrCGv8sYg32Ed691';
    const members = [
      {
        channel_id: 'grp-1',
        account: 'alice',
        role: 'admin',
        joined_at_unix: 1,
        last_read_at_unix: null,
      },
      {
        channel_id: 'grp-1',
        account: 'Ora.Agent',
        role: 'member',
        joined_at_unix: 2,
        last_read_at_unix: null,
      },
    ];
    const findByNames = jest.fn().mockResolvedValue([
      {
        name: 'ora.agent',
        posting_json_metadata: JSON.stringify({
          profile: { profile_image: avatar },
        }),
        json_metadata: '{}',
        profile_image: null,
      },
    ]);
    const { endpoint, accounts } = makeEndpoint(
      {
        findChannelById: jest.fn().mockResolvedValue(groupChannel),
        listMembers: jest.fn().mockResolvedValue(members),
        isMember: jest.fn().mockResolvedValue(true),
      },
      findByNames,
    );

    const result = await endpoint.execute('grp-1', 'alice');

    expect(accounts.findByNames).toHaveBeenCalledWith(
      expect.arrayContaining(['Ora.Agent', 'ora.agent']),
    );
    expect(result?.members).toEqual([
      { account: 'alice', role: 'admin', avatar_url: null },
      { account: 'Ora.Agent', role: 'member', avatar_url: avatar },
    ]);
  });

  it('skips listMembers and returns empty members for object channels', async () => {
    const { endpoint, repo } = makeEndpoint({
      findChannelById: jest.fn().mockResolvedValue(objectChannel),
      listMembers: jest.fn().mockResolvedValue([
        {
          channel_id: 'obj-ch-1',
          account: 'legacy',
          role: 'member',
          joined_at_unix: 1,
          last_read_at_unix: null,
        },
      ]),
      isMember: jest.fn(),
    });

    const result = await endpoint.execute('obj-ch-1', 'alice');

    expect(repo.listMembers).not.toHaveBeenCalled();
    expect(repo.isMember).not.toHaveBeenCalled();
    expect(result?.members).toEqual([]);
    expect(result?.viewer_role).toBeNull();
    expect(result?.leave_policy).toEqual({
      can_leave: false,
      requires_successor: false,
      eligible_successors: [],
    });
  });

  it('requires membership for non-object channels', async () => {
    const { endpoint } = makeEndpoint({
      findChannelById: jest.fn().mockResolvedValue(groupChannel),
      listMembers: jest.fn().mockResolvedValue([]),
      isMember: jest.fn().mockResolvedValue(false),
    });

    await expect(endpoint.execute('grp-1', 'bob')).rejects.toThrow(ForbiddenException);
  });
});
