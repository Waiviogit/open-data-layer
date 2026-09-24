/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';

import {
  beginScrollRestore,
  isScrollRestorePending,
  resetScrollRestoreForTests,
} from './scroll-memory';
import { ScrollToTopOnEnter } from './scroll-to-top-on-enter';

describe('ScrollToTopOnEnter', () => {
  beforeEach(() => {
    resetScrollRestoreForTests();
  });

  afterEach(() => {
    resetScrollRestoreForTests();
    jest.restoreAllMocks();
  });

  it('scrolls synchronously on a fresh route key', () => {
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    render(<ScrollToTopOnEnter routeKey="spicy-tofu" />);

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('stays put while a history restore is pending', () => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    beginScrollRestore(1200);
    expect(isScrollRestorePending()).toBe(true);

    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    render(<ScrollToTopOnEnter routeKey="spicy-tofu" />);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});