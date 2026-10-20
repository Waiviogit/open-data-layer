import { shouldDismissPostInterceptOverlay } from './use-dismiss-post-intercept-for-object-surface';

describe('shouldDismissPostInterceptOverlay', () => {
  it('keeps the intercept open on a post permalink', () => {
    expect(
      shouldDismissPostInterceptOverlay('/@foodster/bechamel', '/@foodster/bechamel'),
    ).toBe(false);
  });

  it('does not hide when Next pathname is still the underlay profile', () => {
    expect(shouldDismissPostInterceptOverlay('/@foodster', '/@foodster/bechamel')).toBe(false);
  });

  it('hides when the address bar is the account-root profile', () => {
    expect(shouldDismissPostInterceptOverlay('/@foodster/bechamel', '/@foodster')).toBe(true);
    expect(shouldDismissPostInterceptOverlay('/@foodster/bechamel', '/user-profile/foodster')).toBe(
      true,
    );
  });

  it('hides on a full-page object route from either signal', () => {
    expect(shouldDismissPostInterceptOverlay('/object/knife', '/@foodster/bechamel')).toBe(true);
    expect(shouldDismissPostInterceptOverlay('/@foodster/bechamel', '/object/knife')).toBe(true);
  });
});
