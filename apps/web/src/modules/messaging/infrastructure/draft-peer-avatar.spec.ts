import type { ChannelDetail } from '../domain/messaging.types';
import { EMPTY_LEAVE_POLICY } from '../domain/messaging.types';
import {
  applyDraftPeerAvatar,
  rememberDraftPeerAvatar,
  resetDraftPeerAvatarsForTests,
} from './draft-peer-avatar';

function detail(peer: string, avatarUrl?: string | null): ChannelDetail {
  return {
    channel_id: '',
    kind: 'direct',
    creator: 'alice',
    title: null,
    image: null,
    object_id: null,
    access: 'members_only',
    display_title: peer,
    list_title: null,
    peer,
    members: [
      { account: 'alice', role: 'member' },
      { account: peer, role: 'member', avatar_url: avatarUrl },
    ],
    viewer_role: null,
    leave_policy: EMPTY_LEAVE_POLICY,
  };
}

describe('draftPeerAvatar', () => {
  beforeEach(() => {
    resetDraftPeerAvatarsForTests();
  });

  it('stamps the search avatar onto a pre-channel peer', () => {
    rememberDraftPeerAvatar('Ora.Agent', 'https://img.test/ora.webp');
    const next = applyDraftPeerAvatar(detail('ora.agent'));
    expect(next.members[1]?.avatar_url).toBe('https://img.test/ora.webp');
  });

  it('does not replace an avatar the channel API already returned', () => {
    rememberDraftPeerAvatar('ora.agent', 'https://img.test/stale.webp');
    const next = applyDraftPeerAvatar(detail('ora.agent', 'https://img.test/channel.webp'));
    expect(next.members[1]?.avatar_url).toBe('https://img.test/channel.webp');
  });
});
