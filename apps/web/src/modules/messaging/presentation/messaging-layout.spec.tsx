/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';

import { MESSAGING_CENTER_VIEWPORT_SHELL_CLASS } from './messaging-layout.constants';
import { MessagingLayout } from './messaging-layout';

describe('MessagingLayout', () => {
  it('uses shared viewport shell without 72vh cap', () => {
    const { container } = render(
      <MessagingLayout
        list={<div>List</div>}
        chat={<div>Chat</div>}
      />,
    );

    const shell = container.firstElementChild;
    expect(shell?.className).toContain(MESSAGING_CENTER_VIEWPORT_SHELL_CLASS);
    expect(shell?.className).not.toContain('--shell-messaging-submenu-chrome');
    expect(shell?.className).not.toMatch(/72vh/);
    expect(shell?.className).not.toMatch(/42rem/);
  });
});
