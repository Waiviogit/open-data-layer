import {
  buildMessagesHref,
  clearChannelListUnread,
  mergeViewerChannels,
  pickNextChannelAfterLeave,
  resetMessagingChannelTombstonesForTests,
  tombstoneLeftChannel,
} from '../infrastructure/messaging-channel-sync';
import type { ChannelListItem } from '../domain/messaging.types';

function channel(id: string, lastMessageAt: number | null): ChannelListItem {
  return {
    channel_id: id,
    kind: 'group',
    display_title: id,
    list_title: id,
    peer: null,
    members: [],
    last_message_at_unix: lastMessageAt,
    unread_count: 0,
    image: null,
    last_message_preview: null,
  };
}

describe('messaging-channel-sync', () => {
  afterEach(() => {
    resetMessagingChannelTombstonesForTests();
  });

  const channels: ChannelListItem[] = [
    channel('grp-a', null),
    channel('grp-b', null),
  ];

  it('pickNextChannelAfterLeave skips the left channel', () => {
    expect(pickNextChannelAfterLeave(channels, 'grp-a')).toBe('grp-b');
    expect(pickNextChannelAfterLeave(channels, 'grp-b')).toBe('grp-a');
    expect(pickNextChannelAfterLeave(channels, 'grp-missing')).toBe('grp-a');
  });

  it('pickNextChannelAfterLeave prefers most recent last_message_at_unix', () => {
    const sorted = [
      channel('grp-old', 100),
      channel('grp-new', 200),
      channel('grp-left', 300),
    ];
    expect(pickNextChannelAfterLeave(sorted, 'grp-left')).toBe('grp-new');
  });

  it('mergeViewerChannels filters tombstoned channels from server refresh', () => {
    tombstoneLeftChannel('grp-a');
    const merged = mergeViewerChannels(
      [channel('grp-a', 100), channel('grp-b', 50)],
      [],
    );
    expect(merged.map((item) => item.channel_id)).toEqual(['grp-b']);
  });

  it('mergeViewerChannels clears tombstone when server no longer returns channel', () => {
    tombstoneLeftChannel('grp-a');
    mergeViewerChannels([channel('grp-b', 50)], []);
    const merged = mergeViewerChannels([channel('grp-a', 100), channel('grp-b', 50)], []);
    expect(merged.map((item) => item.channel_id)).toEqual(['grp-a', 'grp-b']);
  });

  it('buildMessagesHref omits query when no channel selected', () => {
    expect(buildMessagesHref('alice')).toBe('/@alice/messages');
    expect(buildMessagesHref('alice', 'grp-a')).toBe('/@alice/messages?channel=grp-a');
  });

  it('clearChannelListUnread zeros only the opened channel', () => {
    const unread = { ...channel('grp-a', 100), unread_count: 5 };
    const other = { ...channel('grp-b', 50), unread_count: 3 };
    expect(clearChannelListUnread(unread, 'grp-a').unread_count).toBe(0);
    expect(clearChannelListUnread(other, 'grp-a')).toBe(other);
  });
});
