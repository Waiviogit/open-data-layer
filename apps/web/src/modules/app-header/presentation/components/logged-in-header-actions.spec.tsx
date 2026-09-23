/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { LocaleId, Messages } from '@/i18n/types';

import { LoggedInHeaderActions } from './logged-in-header-actions';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  usePathname: () => '/@gobag/messages',
}));

jest.mock('@/modules/notifications', () => ({
  NotificationBell: () => null,
}));

jest.mock('@/shared/presentation', () => ({
  UserAvatar: () => <span>avatar</span>,
}));

jest.mock('@/modules/auth/infrastructure', () => ({
  clearWalletSession: jest.fn(),
}));

jest.mock('@/modules/business', () => ({
  businessRoutes: {
    relationships: '/business/relationships',
  },
}));

const messages = {
  app_header_account_menu_aria: 'Account menu',
  app_header_coming_soon: 'Coming soon',
  billing: 'Billing',
  bookmarks: 'Bookmarks',
  drafts: 'Drafts',
  logout: 'Logout',
  messages: 'Messages',
  my_feed: 'My feed',
  my_profile: 'Profile',
  orders: 'Orders',
  settings: 'Settings',
  vault: 'Vault',
  wallet: 'Wallet',
  write_post: 'Write',
} as Messages;

function renderMenu() {
  render(
    <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
      <LoggedInHeaderActions user={{ username: 'gobag' }} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
}

describe('LoggedInHeaderActions account menu', () => {
  it('groups logged-in actions and drops the old flat entries', () => {
    renderMenu();

    const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual([
      'My feed',
      'Profile',
      'Wallet',
      'Messages',
      'Bookmarks',
      'Drafts',
      'Vault',
      'Orders',
      'Billing',
      'Settings',
      'Logout',
    ]);

    expect(screen.queryByRole('menuitem', { name: 'Create Object' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Business' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Permissions' })).toBeNull();
  });

  it('links live items and disables Bookmarks, Vault, and Billing', () => {
    renderMenu();

    expect(screen.getByRole('menuitem', { name: 'My feed' })).toHaveAttribute(
      'href',
      '/@gobag',
    );
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/@gobag/about',
    );
    expect(screen.getByRole('menuitem', { name: 'Wallet' })).toHaveAttribute(
      'href',
      '/@gobag/transfers?type=WAIV',
    );
    expect(screen.getByRole('menuitem', { name: 'Messages' })).toHaveAttribute(
      'href',
      '/@gobag/messages',
    );
    expect(screen.getByRole('menuitem', { name: 'Messages' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('menuitem', { name: 'Drafts' })).toHaveAttribute(
      'href',
      '/drafts',
    );
    expect(screen.getByRole('menuitem', { name: 'Orders' })).toHaveAttribute(
      'href',
      '/business/relationships',
    );
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );

    for (const name of ['Bookmarks', 'Vault', 'Billing']) {
      const item = screen.getByRole('menuitem', { name });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveAttribute('title', 'Coming soon');
      expect(item.tagName).toBe('DIV');
    }
  });
});
