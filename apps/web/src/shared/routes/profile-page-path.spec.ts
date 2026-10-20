import {
  accountNameFromRootProfilePath,
  isAccountRootProfilePath,
} from './profile-page-path';

describe('isAccountRootProfilePath', () => {
  it('treats the account root as a profile surface', () => {
    expect(isAccountRootProfilePath('/@foodster')).toBe(true);
    expect(isAccountRootProfilePath('/user-profile/foodster')).toBe(true);
    expect(accountNameFromRootProfilePath('/user-profile/foodster')).toBe('foodster');
  });

  it('does not treat post permalinks or reserved tabs as the account root', () => {
    expect(isAccountRootProfilePath('/@foodster/bechamel')).toBe(false);
    expect(isAccountRootProfilePath('/user-profile/foodster/post/bechamel')).toBe(false);
    expect(isAccountRootProfilePath('/@foodster/threads')).toBe(false);
    expect(accountNameFromRootProfilePath('/@foodster/bechamel')).toBeNull();
  });
});
