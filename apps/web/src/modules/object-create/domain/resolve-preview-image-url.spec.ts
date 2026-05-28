import {
  previewImageFromFields,
  resolvePreviewImageUrl,
} from './resolve-preview-image-url';

describe('resolvePreviewImageUrl', () => {
  it('reads https url from json value', () => {
    expect(
      resolvePreviewImageUrl({ url: 'https://example.com/a.jpg' }),
    ).toBe('https://example.com/a.jpg');
  });

  it('reads cid from json value via gateway', () => {
    expect(resolvePreviewImageUrl({ cid: 'QmTest' })).toBe(
      'https://ipfs.io/ipfs/QmTest',
    );
  });

  it('reads plain url string', () => {
    expect(resolvePreviewImageUrl('https://example.com/x.png')).toBe(
      'https://example.com/x.png',
    );
  });
});

describe('previewImageFromFields', () => {
  it('finds image row by entryKey among multiple fields', () => {
    const url = previewImageFromFields([
      { entryKey: 'name', updateType: 'name', value: 'X' },
      {
        entryKey: 'image',
        updateType: 'image',
        value: { url: 'https://cdn.example/hero.webp' },
      },
    ]);
    expect(url).toBe('https://cdn.example/hero.webp');
  });
});
