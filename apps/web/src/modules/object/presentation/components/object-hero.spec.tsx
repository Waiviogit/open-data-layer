/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/modules/object-updates/presentation/components/add-update-modal', () => ({
  AddUpdateModal: () => null,
}));

jest.mock('@/shared/presentation', () => ({
  ObjectThumbnail: () => null,
  OptimisticNavLink: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

jest.mock('@/shared/presentation/layout', () => ({
  ShellFullBleedBand: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ShellInset: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/shell-mode', () => ({
  shouldHideHeroOnDesktop: () => false,
  useShellMode: () => ({ resolvedMode: 'default' }),
  HIDDEN_ON_DESKTOP_CLASS: 'hidden',
}));

jest.mock('./object-hero-cover-image', () => ({
  ObjectHeroCoverImage: () => null,
}));

jest.mock('./instacart-button', () => ({
  InstacartButton: ({ objectId }: { objectId: string }) => (
    <button type="button">Get Recipe Ingredients {objectId}</button>
  ),
}));

import { ObjectHero } from './object-hero';

const baseProps = {
  title: 'Good Co.',
  subtitleTitle: null,
  avatarUrl: null,
  coverImageUrl: null,
  tagline: null,
  displayWeightLabel: '2.421',
  kindLabel: 'restaurant',
  statusBadgeLabel: null,
  isEditMode: false,
  isFollowing: false,
  isBell: false,
  isFavorite: false,
  onToggleEdit: () => undefined,
  onFollowToggle: () => undefined,
  onBellToggle: () => undefined,
  onFavoriteToggle: () => undefined,
  primaryNav: null,
};

describe('ObjectHero status badge', () => {
  it('links permanently closed label to status updates when href is set', () => {
    render(
      <ObjectHero
        {...baseProps}
        statusBadgeLabel="Permanently closed"
        statusUpdatesHref="/object/rest-1/updates?update_type=status"
      />,
    );

    const link = screen.getByRole('link', { name: 'Permanently closed' });
    expect(link.getAttribute('href')).toBe('/object/rest-1/updates?update_type=status');
    expect(screen.getByText('restaurant')).toBeTruthy();
    expect(screen.getByText('2.421')).toBeTruthy();
  });

  it('renders non-linked badge when href is absent', () => {
    render(
      <ObjectHero
        {...baseProps}
        statusBadgeLabel="Discontinued"
      />,
    );

    expect(screen.getByText('Discontinued')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Discontinued' })).toBeNull();
  });
});

describe('ObjectHero layout and styling', () => {
  it('renders title with display typography', () => {
    render(<ObjectHero {...baseProps} />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Good Co.' });
    expect(heading.className).toContain('text-display');
    expect(heading.className).toContain('tracking-display');
  });

  it('uses pill radius on Follow and Edit actions', () => {
    render(<ObjectHero {...baseProps} />);

    const followBtn = screen.getByRole('button', { name: 'object_detail_follow' });
    const editBtn = screen.getByRole('button', { name: 'object_detail_edit' });
    expect(followBtn.className).toContain('rounded-pill');
    expect(editBtn.className).toContain('rounded-pill');
  });

  it('uses circular radius on favorite icon action', () => {
    render(<ObjectHero {...baseProps} />);

    const favoriteBtn = screen.getByRole('button', {
      name: 'object_detail_favorites_add',
    });
    expect(favoriteBtn.className).toContain('rounded-circle');
  });
});

describe('ObjectHero avatar gallery', () => {
  const photosAlbum = {
    name: 'Photos',
    items: [
      {
        url: 'https://cdn.example.com/avatar.jpg',
        rankScore: 100,
        isAvatar: true,
      },
      {
        url: 'https://cdn.example.com/other.jpg',
        rankScore: 90,
        isAvatar: false,
      },
    ],
  };

  it('opens the Photos album on the avatar index when the avatar is clicked', () => {
    const onOpenGalleryPhoto = jest.fn();

    render(
      <ObjectHero
        {...baseProps}
        avatarUrl="https://cdn.example.com/avatar.jpg"
        galleryPhotosAlbum={photosAlbum}
        onOpenGalleryPhoto={onOpenGalleryPhoto}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'gallery' }));
    expect(onOpenGalleryPhoto).toHaveBeenCalledWith(photosAlbum, 0);
  });

  it('does not render a gallery button when avatarUrl is null', () => {
    render(
      <ObjectHero
        {...baseProps}
        galleryPhotosAlbum={photosAlbum}
        onOpenGalleryPhoto={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'gallery' })).toBeNull();
  });

  it('keeps the edit overlay in edit mode and does not open the gallery', () => {
    const onOpenGalleryPhoto = jest.fn();

    render(
      <ObjectHero
        {...baseProps}
        avatarUrl="https://cdn.example.com/avatar.jpg"
        isEditMode
        galleryPhotosAlbum={photosAlbum}
        onOpenGalleryPhoto={onOpenGalleryPhoto}
        editContext={{
          objectId: 'obj-1',
          viewerUsername: 'alice',
          supportedUpdateTypes: ['image', 'imageBackground'],
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'gallery' })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'object_detail_edit_avatar_background' }),
    );
    expect(onOpenGalleryPhoto).not.toHaveBeenCalled();
  });
});

describe('ObjectHero Instacart', () => {
  it('renders the Instacart button in the hero when flagged', () => {
    render(
      <ObjectHero
        {...baseProps}
        objectId="recipe-1"
        showInstacartButton
      />,
    );
    expect(screen.getByRole('button', { name: 'Get Recipe Ingredients recipe-1' })).toBeTruthy();
  });

  it('omits the Instacart button by default', () => {
    render(<ObjectHero {...baseProps} />);
    expect(screen.queryByRole('button', { name: /Get Recipe Ingredients/ })).toBeNull();
  });
});
