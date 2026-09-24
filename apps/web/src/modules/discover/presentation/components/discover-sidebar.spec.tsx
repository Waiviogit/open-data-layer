/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { LocaleId, Messages } from '@/i18n/types';

import { writeDiscoverObjectTypeCookie } from '../../domain/discover-type-cookie';
import { DiscoverSidebar } from './discover-sidebar';

let mockSearch = 'type=product';

jest.mock('@/shared/presentation', () => ({
  OptimisticNavLink: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
  useEffectiveNav: () => ({ pathname: '/discover', search: mockSearch }),
}));

jest.mock('../../domain/discover-type-cookie', () => ({
  writeDiscoverObjectTypeCookie: jest.fn(),
}));

const messages = {
  discover_find_object_type: 'Find object type',
  object_create_group_popular: 'Popular',
  discover_users_menu: 'Users',
  discover_all_users: 'All',
  discover_all_types_menu: 'All types',
  discover_show_more: 'Show more',
  discover_no_results: 'No results found.',
} as Messages;

function renderSidebar() {
  render(
    <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
      <DiscoverSidebar usersMode={false} objectType="product" q="" sort="rank" />
    </I18nProvider>,
  );
}

function sectionByHeading(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name });
  const section = heading.closest('section');
  if (!section) {
    throw new Error(`Missing section for ${name}`);
  }
  return section;
}

describe('DiscoverSidebar', () => {
  beforeEach(() => {
    mockSearch = 'type=product';
    jest.mocked(writeDiscoverObjectTypeCookie).mockClear();
  });

  it('renders Popular, Users, then All types', () => {
    renderSidebar();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    expect(headings).toEqual(['Popular', 'Users', 'All types']);
  });

  it('filters Popular and All types by search without hiding Users', () => {
    renderSidebar();
    fireEvent.change(screen.getByPlaceholderText('Find object type'), {
      target: { value: 'offered' },
    });

    expect(screen.queryByRole('heading', { name: 'Popular' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(within(sectionByHeading('All types')).getByRole('link', { name: 'Service offered' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Restaurant' })).not.toBeInTheDocument();
  });

  it('shows empty state when search matches no types', () => {
    renderSidebar();
    fireEvent.change(screen.getByPlaceholderText('Find object type'), {
      target: { value: 'zzz' },
    });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Popular' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'All types' })).not.toBeInTheDocument();
  });

  it('writes the type cookie when a type is clicked', () => {
    renderSidebar();
    fireEvent.click(within(sectionByHeading('Popular')).getByRole('link', { name: 'Business' }));
    expect(writeDiscoverObjectTypeCookie).toHaveBeenCalledWith('business');
  });

  it('shows a glyph and accent-soft wash on the selected type', () => {
    renderSidebar();
    const product = within(sectionByHeading('Popular')).getByRole('link', { name: 'Product' });
    expect(product.querySelector('svg')).not.toBeNull();
    expect(product.className).toContain('bg-accent-soft');
  });

  it('does not expand All types when the active type is in Popular', () => {
    renderSidebar();

    expect(within(sectionByHeading('Popular')).getByRole('link', { name: 'Product' })).toBeInTheDocument();
    expect(within(sectionByHeading('All types')).queryByRole('link', { name: 'Product' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show more/ })).toBeInTheDocument();
  });

  it('scrolls inside the viewport and shows 15 All types before Show more', () => {
    renderSidebar();

    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('lg:overflow-y-auto');
    expect(aside.className).toContain('scrollbar-hide');
    expect(aside.className).toContain(
      'lg:max-h-[calc(100dvh-var(--app-header-height,4rem)-2rem)]',
    );
    const allTypes = sectionByHeading('All types');
    expect(within(allTypes).getAllByRole('link')).toHaveLength(15);
    expect(within(allTypes).getByRole('link', { name: 'Page' })).toBeInTheDocument();
    expect(within(allTypes).queryByRole('link', { name: 'Person' })).not.toBeInTheDocument();
  });
});
