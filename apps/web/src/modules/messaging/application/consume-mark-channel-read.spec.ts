import {
  consumeMarkChannelRead,
  latestMessageCreatedAtUnix,
  releaseMarkChannelRead,
} from './consume-mark-channel-read';

describe('latestMessageCreatedAtUnix', () => {
  it('returns 0 for an empty list', () => {
    expect(latestMessageCreatedAtUnix([])).toBe(0);
  });

  it('returns the max created_at_unix', () => {
    expect(
      latestMessageCreatedAtUnix([
        { created_at_unix: 10 },
        { created_at_unix: 30 },
        { created_at_unix: 20 },
      ]),
    ).toBe(30);
  });
});

describe('consumeMarkChannelRead', () => {
  it('allows the first watermark and skips the same or older one', () => {
    const channelId = `ch-${Date.now()}-${Math.random()}`;
    expect(consumeMarkChannelRead(channelId, 100)).toBe(true);
    expect(consumeMarkChannelRead(channelId, 100)).toBe(false);
    expect(consumeMarkChannelRead(channelId, 99)).toBe(false);
    expect(consumeMarkChannelRead(channelId, 101)).toBe(true);
  });

  it('tracks channels independently', () => {
    const a = `ch-a-${Date.now()}-${Math.random()}`;
    const b = `ch-b-${Date.now()}-${Math.random()}`;
    expect(consumeMarkChannelRead(a, 10)).toBe(true);
    expect(consumeMarkChannelRead(b, 10)).toBe(true);
    expect(consumeMarkChannelRead(a, 10)).toBe(false);
  });

  it('rejects empty channel or non-positive unix', () => {
    expect(consumeMarkChannelRead('', 1)).toBe(false);
    expect(consumeMarkChannelRead('ch-x', 0)).toBe(false);
    expect(consumeMarkChannelRead('ch-x', -1)).toBe(false);
  });

  it('releaseMarkChannelRead allows retry of the same watermark', () => {
    const channelId = `ch-rel-${Date.now()}-${Math.random()}`;
    expect(consumeMarkChannelRead(channelId, 50)).toBe(true);
    releaseMarkChannelRead(channelId, 50);
    expect(consumeMarkChannelRead(channelId, 50)).toBe(true);
  });
});
