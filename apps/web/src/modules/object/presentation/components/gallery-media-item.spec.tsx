/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { GalleryMediaItem, isGalleryVideoUrl } from './gallery-media-item';

jest.mock('@/shared/presentation/components/video-preview-player', () => ({
  VideoPreviewPlayer: ({
    previewOnly,
    variant,
  }: {
    previewOnly?: boolean;
    variant?: string;
  }) => (
    <div data-testid="video-preview-player" data-preview-only={String(previewOnly)} data-variant={variant} />
  ),
}));

jest.mock('./gallery-image', () => ({
  GalleryImage: ({ src }: { src: string }) => (
    <img data-testid="gallery-image" src={src} alt="" />
  ),
}));

describe('isGalleryVideoUrl', () => {
  it('detects YouTube watch URLs', () => {
    expect(isGalleryVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('returns false for image URLs', () => {
    expect(isGalleryVideoUrl('https://cdn.example.com/photo.jpg')).toBe(false);
  });
});

describe('GalleryMediaItem', () => {
  it('renders video preview for YouTube gallery URL', () => {
    render(
      <div className="relative aspect-square">
        <GalleryMediaItem
          src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          sizes="320px"
          previewOnly
        />
      </div>,
    );

    expect(screen.getByTestId('video-preview-player')).toBeInTheDocument();
    expect(screen.getByTestId('video-preview-player')).toHaveAttribute('data-preview-only', 'true');
    expect(screen.queryByTestId('gallery-image')).not.toBeInTheDocument();
  });

  it('renders GalleryImage for regular photo URL', () => {
    render(
      <div className="relative aspect-square">
        <GalleryMediaItem src="https://cdn.example.com/photo.jpg" sizes="320px" />
      </div>,
    );

    expect(screen.getByTestId('gallery-image')).toHaveAttribute(
      'src',
      'https://cdn.example.com/photo.jpg',
    );
  });
});
