/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        object_status_permanently_closed: 'Permanently closed',
        object_status_closed_location_body: 'This location is no longer operating.',
        object_status_suggest_correction: 'Suggest a correction',
        object_edit_add_update: 'Add update',
        object_edit_group_header: 'HEADER',
        object_edit_group_details: 'DETAILS',
        object_edit_group_community: 'COMMUNITY',
        object_edit_group_contact: 'CONTACT',
        show_more: 'Show more',
        show_less: 'View less',
        object_detail_description_button: 'Description',
      })[key] ?? key,
    locale: 'en-US',
  }),
}));

jest.mock('@/modules/object-updates/presentation/components/add-update-modal', () => ({
  AddUpdateModal: () => null,
}));

jest.mock('./object-geo-preview', () => ({
  ObjectGeoPreview: () => null,
}));

jest.mock('./object-gallery-carousel', () => ({
  ObjectGalleryCarousel: () => null,
}));

jest.mock('./object-menu-items-static', () => ({
  ObjectMenuItemsStatic: () => null,
}));

jest.mock('./object-options-section', () => ({
  ObjectOptionsSection: () => null,
}));

jest.mock('./object-tags-left-rail-section', () => ({
  ObjectTagsLeftRailSection: () => null,
}));

jest.mock('./object-category-left-rail-section', () => ({
  ObjectCategoryLeftRailSection: () => null,
}));

jest.mock('./object-authors-left-rail-section', () => ({
  ObjectAuthorsLeftRailSection: () => null,
}));

jest.mock('./object-feature-list-left-rail-section', () => ({
  ObjectFeatureListLeftRailSection: () => null,
}));

jest.mock('./star-rating', () => ({
  StarRating: () => null,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

jest.mock('@/shared/presentation', () => ({
  shouldUnoptimizeRemoteImage: () => false,
  OptimisticNavLink: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
  HydrationSafeAnchor: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import { ObjectLeftRailPanel } from './object-left-rail-panel';

describe('ObjectLeftRailPanel closed venue status', () => {
  it('renders permanently closed notice with suggest correction link', () => {
    render(
      <ObjectLeftRailPanel
        blocks={[
          {
            kind: 'status',
            headingLabel: 'Status',
            status: 'closed',
          },
        ]}
        objectTypeKey="restaurant"
        objectId="rest-1"
        statusUpdatesHref="/object/rest-1/updates?update_type=status"
      />,
    );

    expect(screen.getByText('Permanently closed')).toBeTruthy();
    expect(screen.getByText('This location is no longer operating.')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Suggest a correction' });
    expect(link.getAttribute('href')).toBe('/object/rest-1/updates?update_type=status');
  });

  it('does not render notice for active restaurant without status block', () => {
    render(
      <ObjectLeftRailPanel
        blocks={[{ kind: 'address', headingLabel: 'Address', text: '123 Main St' }]}
        objectTypeKey="restaurant"
        objectId="rest-1"
      />,
    );

    expect(screen.queryByText('Permanently closed')).toBeNull();
    expect(screen.getByText('123 Main St')).toBeTruthy();
  });
});

describe('ObjectLeftRailPanel contact and detail icons', () => {
  it('renders lucide-backed rows for price, hours, address, website, and email', () => {
    const { container } = render(
      <ObjectLeftRailPanel
        blocks={[
          { kind: 'price', headingLabel: 'Price', text: '$12.50' },
          {
            kind: 'workHours',
            headingLabel: 'Hours',
            lines: ['Mon–Fri 9am–5pm', 'Sat 10am–2pm'],
          },
          { kind: 'address', headingLabel: 'Address', text: '456 Oak Ave' },
          {
            kind: 'url',
            headingLabel: 'Url',
            href: 'https://peakd.com',
          },
          {
            kind: 'websites',
            headingLabel: 'Website',
            entries: [{ title: 'example.com', link: 'https://example.com' }],
          },
          { kind: 'email', headingLabel: 'Email', address: 'hello@example.com' },
        ]}
        objectTypeKey="restaurant"
        objectId="rest-1"
      />,
    );

    expect(screen.getByText('$12.50')).toBeTruthy();
    expect(container.textContent).not.toMatch(/\$\s*\$12\.50/);
    expect(screen.getByText('Mon–Fri 9am–5pm')).toBeTruthy();
    expect(screen.getByText('Sat 10am–2pm')).toBeTruthy();
    expect(screen.getByText('456 Oak Ave')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'https://peakd.com' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'example.com' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'hello@example.com' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('ObjectLeftRailPanel edit mode group headings', () => {
  it('renders section headings in edit mode only', () => {
    const { rerender } = render(
      <ObjectLeftRailPanel
        blocks={[
          { kind: 'name', headingLabel: 'Name', text: 'Cafe' },
          { kind: 'description', headingLabel: 'Description', text: 'Nice place' },
        ]}
        objectTypeKey="restaurant"
        objectId="rest-1"
        editContext={{
          objectId: 'rest-1',
          viewerUsername: 'alice',
          supportedUpdateTypes: ['name', 'description'],
          tagCategoryNames: [],
          galleryAlbumNames: [],
          onChainGalleryAlbumNames: [],
          updateTypeCounts: {},
        }}
      />,
    );

    expect(screen.getByText('HEADER')).toBeTruthy();
    expect(screen.getByText('DETAILS')).toBeTruthy();

    rerender(
      <ObjectLeftRailPanel
        blocks={[
          { kind: 'name', headingLabel: 'Name', text: 'Cafe' },
          { kind: 'description', headingLabel: 'Description', text: 'Nice place' },
        ]}
        objectTypeKey="restaurant"
        objectId="rest-1"
      />,
    );

    expect(screen.queryByText('HEADER')).toBeNull();
    expect(screen.queryByText('DETAILS')).toBeNull();
  });
});

describe('ObjectLeftRailPanel description inline expand/collapse', () => {
  const longDescription =
    'Catch sits on the second floor of Bayview Pier, high enough that Steveston Harbour becomes part of dinner. Fishing boats and docks fill the view below; outdoors, the rooftop patio opens it to 270 degrees across the river inlet. The menu makes sense here with fresh seafood.';

  it('truncates long description and allows expanding and collapsing inline', () => {
    render(
      <ObjectLeftRailPanel
        blocks={[
          {
            kind: 'description',
            headingLabel: 'Description',
            text: longDescription,
          },
        ]}
        objectTypeKey="restaurant"
        objectId="ehk-catch-kitchen-bar"
      />,
    );

    // Initial state: truncated preview and "Show more" button
    const showMoreButton = screen.getByRole('button', { name: 'Show more' });
    expect(showMoreButton).toBeTruthy();
    expect(screen.queryByText(longDescription)).toBeNull();

    // Click "Show more"
    fireEvent.click(showMoreButton);

    // Expanded state: full text is shown, button becomes "View less"
    expect(screen.getByText(longDescription)).toBeTruthy();
    const viewLessButton = screen.getByRole('button', { name: 'View less' });
    expect(viewLessButton).toBeTruthy();

    // Click "View less"
    fireEvent.click(viewLessButton);

    // Collapsed state again
    expect(screen.queryByText(longDescription)).toBeNull();
    expect(screen.getByRole('button', { name: 'Show more' })).toBeTruthy();
  });
});
