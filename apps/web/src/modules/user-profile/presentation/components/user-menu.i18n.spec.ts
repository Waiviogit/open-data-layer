import * as enUS from '../../../../i18n/locales/en-US.json';

/**
 * Guards the translation keys used by the profile social submenu (UserMenu followers variant).
 * Ensures agents/scripts do not drop keys used with t('…').
 */
describe('UserMenu social submenu i18n keys (en-US)', () => {
  it('defines keys for Followers / Following / Following objects + aria', () => {
    expect(typeof enUS.followers).toBe('string');
    expect(enUS.followers.length).toBeGreaterThan(0);
    expect(typeof enUS.following).toBe('string');
    expect(enUS.following.length).toBeGreaterThan(0);
    expect(typeof enUS.user_profile_following_objects).toBe('string');
    expect(enUS.user_profile_following_objects.length).toBeGreaterThan(0);
    expect(typeof enUS.user_profile_submenu_followers_aria).toBe('string');
    expect(enUS.user_profile_submenu_followers_aria.length).toBeGreaterThan(0);
  });
});
