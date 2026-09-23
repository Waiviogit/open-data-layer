/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';

import type { ProjectedGalleryPhotoView } from '../../domain/object-page.types';

jest.mock('./gallery-media-item', () => ({
  GalleryMediaItem: ({
    src,
    imageClassName,
    onImageLoad,
  }: {
    src: string;
    imageClassName?: string;
    onImageLoad?: (event: { currentTarget: HTMLImageElement }) => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="gallery-image"
      src={src}
      className={imageClassName}
      alt=""
      onLoad={(event) => {
        Object.defineProperty(event.currentTarget, 'naturalWidth', { value: 600 });
        Object.defineProperty(event.currentTarget, 'naturalHeight', { value: 900 });
        onImageLoad?.(event);
      }}
    />
  ),
  isGalleryVideoUrl: () => false,
}));

import { ObjectGalleryCarousel } from './object-gallery-carousel';

const messages = {
  object_detail_gallery_prev: 'Previous photo',
  object_detail_gallery_next: 'Next photo',
  gallery: 'Gallery',
};

const photos: ProjectedGalleryPhotoView[] = [
  { url: 'https://example.com/photo-1.jpg', rankScore: null, isAvatar: false },
  { url: 'https://example.com/photo-2.jpg', rankScore: null, isAvatar: false },
];

function renderCarousel(previewImageUrl: string | null = null) {
  return render(
    <I18nProvider locale="en-US" messages={messages}>
      <ObjectGalleryCarousel photos={photos} previewImageUrl={previewImageUrl} />
    </I18nProvider>,
  );
}

function frameAspectRatio(): string {
  const frame = screen.getByTestId('gallery-carousel-frame');
  return frame.style.aspectRatio;
}

describe('ObjectGalleryCarousel preview mode', () => {
  it('keeps prev/next controls mounted and disabled during preview', () => {
    renderCarousel('https://example.com/avatar.jpg');

    expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled();
  });

  it('overlays prev/next on the photo instead of nesting them in the photo button', () => {
    render(
      <I18nProvider locale="en-US" messages={messages}>
        <ObjectGalleryCarousel photos={photos} onPhotoClick={jest.fn()} />
      </I18nProvider>,
    );

    const frameButton = screen.getByRole('button', { name: 'Gallery' });
    const prev = screen.getByRole('button', { name: 'Previous photo' });
    expect(frameButton.contains(prev)).toBe(false);
    expect(prev.className).toContain('absolute');
  });

  it('uses object-contain for preview images', () => {
    renderCarousel('https://example.com/avatar.jpg');

    expect(screen.getByTestId('gallery-image')).toHaveClass('object-contain');
  });

  it('uses object-contain before gallery photo aspect is known', () => {
    renderCarousel(null);

    expect(screen.getByTestId('gallery-image')).toHaveClass('object-contain');
  });

  it('uses object-contain and natural portrait aspect after gallery photo load', () => {
    renderCarousel(null);

    fireEvent.load(screen.getByTestId('gallery-image'));

    expect(screen.getByTestId('gallery-image')).toHaveClass('object-contain');
    expect(frameAspectRatio()).toBe(String(600 / 900));
  });

  it('does not change frame aspect ratio when preview image loads', () => {
    renderCarousel('https://example.com/avatar.jpg');

    const aspectBeforeLoad = frameAspectRatio();
    fireEvent.load(screen.getByTestId('gallery-image'));

    expect(frameAspectRatio()).toBe(aspectBeforeLoad);
  });
});

describe('ObjectGalleryCarousel touch swipe', () => {
  it('swipes left to advance to next photo and suppresses click on photo frame', () => {
    const onPhotoClick = jest.fn();
    render(
      <I18nProvider locale="en-US" messages={messages}>
        <ObjectGalleryCarousel photos={photos} onPhotoClick={onPhotoClick} />
      </I18nProvider>,
    );

    const frameButton = screen.getByRole('button', { name: 'Gallery' });
    expect(screen.getByTestId('gallery-image')).toHaveAttribute(
      'src',
      'https://example.com/photo-1.jpg',
    );

    // Swipe left (dx = -80)
    fireEvent.touchStart(frameButton, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(frameButton, { touches: [{ clientX: 120, clientY: 100 }] });
    fireEvent.touchEnd(frameButton);

    // Next photo should now be displayed
    expect(screen.getByTestId('gallery-image')).toHaveAttribute(
      'src',
      'https://example.com/photo-2.jpg',
    );

    // Click immediately after swipe should be suppressed
    fireEvent.click(frameButton);
    expect(onPhotoClick).not.toHaveBeenCalled();
  });

  it('swipes right to go to previous photo', () => {
    render(
      <I18nProvider locale="en-US" messages={messages}>
        <ObjectGalleryCarousel photos={photos} />
      </I18nProvider>,
    );

    const frame = screen.getByTestId('gallery-carousel-frame').parentElement!;
    expect(screen.getByTestId('gallery-image')).toHaveAttribute(
      'src',
      'https://example.com/photo-1.jpg',
    );

    // Swipe right (dx = +80) -> wraps to photo-2
    fireEvent.touchStart(frame, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(frame, { touches: [{ clientX: 180, clientY: 100 }] });
    fireEvent.touchEnd(frame);

    expect(screen.getByTestId('gallery-image')).toHaveAttribute(
      'src',
      'https://example.com/photo-2.jpg',
    );
  });

  it('allows normal clicks when touch does not exceed swipe threshold', () => {
    const onPhotoClick = jest.fn();
    render(
      <I18nProvider locale="en-US" messages={messages}>
        <ObjectGalleryCarousel photos={photos} onPhotoClick={onPhotoClick} />
      </I18nProvider>,
    );

    const frameButton = screen.getByRole('button', { name: 'Gallery' });

    // Micro-movement (tap)
    fireEvent.touchStart(frameButton, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(frameButton, { touches: [{ clientX: 105, clientY: 100 }] });
    fireEvent.touchEnd(frameButton);

    fireEvent.click(frameButton);
    expect(onPhotoClick).toHaveBeenCalledWith(0);
  });
});
