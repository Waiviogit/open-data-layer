import { resolveGalleryCarouselAspectRatio } from './resolve-gallery-carousel-aspect-ratio';

describe('resolveGalleryCarouselAspectRatio', () => {
  it('uses 3:4 frame for portrait photos', () => {
    expect(resolveGalleryCarouselAspectRatio(600, 900)).toBe(0.75);
  });

  it('uses square frame for square photos', () => {
    expect(resolveGalleryCarouselAspectRatio(800, 800)).toBe(1);
  });

  it('uses natural ratio for landscape photos up to 16:9', () => {
    expect(resolveGalleryCarouselAspectRatio(1600, 900)).toBeCloseTo(16 / 9);
    expect(resolveGalleryCarouselAspectRatio(1200, 900)).toBeCloseTo(4 / 3);
  });

  it('caps ultra-wide panoramas at 16:9', () => {
    expect(resolveGalleryCarouselAspectRatio(3000, 900)).toBeCloseTo(16 / 9);
  });
});
