import {
  previewImageFromFields,
  resolvePreviewImageUrl,
} from './resolve-preview-image-url';

const CONTENT_BASE = 'https://example.com';

describe('resolvePreviewImageUrl', () => {
  it('reads https url from json value', () => {
    expect(
      resolvePreviewImageUrl({ url: 'https://example.com/a.jpg' }, CONTENT_BASE),
    ).toBe('https://example.com/a.jpg');
  });

  it('reads cid from json value via content gateway when base is configured', () => {
    expect(resolvePreviewImageUrl({ cid: 'QmTest' }, CONTENT_BASE)).toBe(
      'https://example.com/ipfs-gateway/content/image/QmTest',
    );
  });

  it('returns null for cid when content base is empty', () => {
    expect(resolvePreviewImageUrl({ cid: 'QmTest' }, '')).toBeNull();
  });

  it('reads plain url string', () => {
    expect(
      resolvePreviewImageUrl('https://example.com/x.png', CONTENT_BASE),
    ).toBe('https://example.com/x.png');
  });
});

describe('previewImageFromFields', () => {
  it('finds image row by entryKey among multiple fields', () => {
    const url = previewImageFromFields(
      [
        { entryKey: 'name', updateType: 'name', value: 'X' },
        {
          entryKey: 'image',
          updateType: 'image',
          value: { url: 'https://cdn.example/hero.webp' },
        },
      ],
      CONTENT_BASE,
    );
    expect(url).toBe('https://cdn.example/hero.webp');
  });
});
