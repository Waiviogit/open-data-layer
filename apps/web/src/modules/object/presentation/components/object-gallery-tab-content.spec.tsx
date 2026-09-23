/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';

import type { ProjectedGalleryAlbumView } from '../../domain/object-page.types';
import { ObjectGalleryTabContent } from './object-gallery-tab-content';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} />
  ),
}));

jest.mock('@/modules/object-updates/presentation/components/add-update-modal', () => ({
  AddUpdateModal: () => null,
}));

jest.mock('../../infrastructure/object-related-album.actions', () => ({
  fetchObjectRelatedAlbumPreviewAction: jest.fn(),
}));

const messages = {
  play_video: 'Play video',
  back_to_albums: 'Back to albums',
  gallery_list_empty: 'Empty',
};

const youtubeAlbum: ProjectedGalleryAlbumView = {
  name: 'Videos',
  items: [
    {
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
      rankScore: null,
      isAvatar: false,
    },
  ],
};

const photoAlbum: ProjectedGalleryAlbumView = {
  name: 'Photos',
  items: [
    { url: 'https://cdn.example.com/photo.jpg', rankScore: null, isAvatar: false },
  ],
};

function renderAlbum(album: ProjectedGalleryAlbumView, onOpenPhoto = jest.fn()) {
  render(
    <I18nProvider locale="en-US" messages={messages}>
      <ObjectGalleryTabContent
        objectId="obj-1"
        objectName="Object"
        galleryAlbums={[album]}
        activeAlbumName={album.name}
        viewerUsername={null}
        onRequireLogin={jest.fn()}
        supportedUpdateTypes={[]}
        onOpenAlbum={jest.fn()}
        onBackToAlbums={jest.fn()}
        onOpenPhoto={onOpenPhoto}
        objectTypeKey="widget"
      />
    </I18nProvider>,
  );
  return onOpenPhoto;
}

describe('ObjectGalleryTabContent media tiles', () => {
  it('shows a video tile as a poster the user can open', () => {
    const onOpenPhoto = renderAlbum(youtubeAlbum);

    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
    );
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Play video' }));

    expect(onOpenPhoto).toHaveBeenCalledWith(youtubeAlbum, 0);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('shows a photo tile without video chrome', () => {
    renderAlbum(photoAlbum);

    expect(document.querySelector('img')?.getAttribute('src')).toContain(
      'https://cdn.example.com/photo.jpg',
    );
    expect(screen.queryByRole('button', { name: 'Play video' })).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
  });
});
