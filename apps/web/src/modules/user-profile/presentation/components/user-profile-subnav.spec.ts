import { getSubmenuVariant } from './user-profile-subnav';

describe('getSubmenuVariant', () => {
  it('treats authorizations as the wallet submenu', () => {
    expect(getSubmenuVariant('/@alice/permissions')).toBe('wallet');
    expect(getSubmenuVariant('/user-profile/alice/permissions')).toBe('wallet');
  });

  it('keeps currency wallet routes on the wallet submenu', () => {
    expect(getSubmenuVariant('/@alice/transfers')).toBe('wallet');
    expect(getSubmenuVariant('/@alice/transfers/table')).toBeNull();
  });

  it('does not treat messages as a posts submenu', () => {
    expect(getSubmenuVariant('/@alice/messages')).toBeNull();
    expect(getSubmenuVariant('/user-profile/alice/messages')).toBeNull();
    expect(getSubmenuVariant('/@alice')).toBe('feed');
  });
});
