import { buildObjectMetadata } from '../application/build-object-metadata';
import type { ObjectSeoInput } from './metadata.types';

jest.mock('../infrastructure/seo-public-origin', () => ({
  seoPublicOrigin: () => 'https://site.com',
}));

const baseInput: ObjectSeoInput = {
  objectId: 'obj-1',
  title: 'My Object',
  description: 'Object description',
  canonicalUrl: 'https://custom.example/object/obj-1',
  avatarUrl: null,
  coverImageUrl: 'https://cdn.example/cover.jpg',
  objectTypeKey: 'product',
  jsonLd: null,
};

describe('buildObjectMetadata', () => {
  it('uses summary_large_image when cover is present', () => {
    const meta = buildObjectMetadata(baseInput);
    expect(meta.twitter?.card).toBe('summary_large_image');
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://cdn.example/cover.jpg' },
    ]);
    expect(meta.alternates?.canonical).toBe('https://custom.example/object/obj-1');
  });

  it('uses default OG image when no cover or avatar', () => {
    const meta = buildObjectMetadata({
      ...baseInput,
      coverImageUrl: null,
      avatarUrl: null,
      canonicalUrl: null,
    });
    expect(meta.twitter?.card).toBe('summary_large_image');
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://site.com/opengraph-image.png' },
    ]);
    expect(meta.alternates?.canonical).toBe('https://site.com/object/obj-1');
  });
});
