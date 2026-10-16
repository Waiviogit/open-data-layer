import { consumeMarkProfileFeedRead } from './consume-mark-profile-feed-read';

describe('consumeMarkProfileFeedRead', () => {
  it('skips a remount of the same account+tab and allows a real tab change', () => {
    const account = `user-${Date.now()}-${Math.random()}`;
    expect(consumeMarkProfileFeedRead(account, 'messages')).toBe(true);
    expect(consumeMarkProfileFeedRead(account, 'messages')).toBe(false);
    expect(consumeMarkProfileFeedRead(account, 'posts')).toBe(true);
    expect(consumeMarkProfileFeedRead(account, 'messages')).toBe(true);
  });
});
