import { formatUnreadBadgeCount } from './format-unread-badge-count';

describe('formatUnreadBadgeCount', () => {
  it('hides non-positive counts', () => {
    expect(formatUnreadBadgeCount(0)).toBeNull();
    expect(formatUnreadBadgeCount(-1)).toBeNull();
  });

  it('caps above 9', () => {
    expect(formatUnreadBadgeCount(3)).toBe('3');
    expect(formatUnreadBadgeCount(9)).toBe('9');
    expect(formatUnreadBadgeCount(12)).toBe('9+');
  });
});
