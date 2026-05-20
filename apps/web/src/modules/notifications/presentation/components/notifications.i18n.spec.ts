import * as enUS from '../../../../i18n/locales/en-US.json';

/**
 * Guards translation keys used by the notification bell and /notifications page.
 */
describe('Notifications UI i18n keys (en-US)', () => {
  it('defines all keys used by notification bell and page', () => {
    const keys = [
      'notifications',
      'notifications_empty_message',
      'notification_following_username',
      'notification_upvoted_username_post',
      'notification_generic_default_message',
      'see_all',
    ] as const;

    for (const key of keys) {
      const value = enUS[key];
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
