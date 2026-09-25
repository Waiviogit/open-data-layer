import {
  getImagePathPost,
  getPreviewProxyImageUrl,
  getProxyImageUrl,
  normalizeLegacyObjectImageUrl,
  resolveObjectImageUrl,
  stripHiveImageProxyPrefix,
} from './get-proxy-image-url';

const NEOXIAN_STEEMIT =
  'https://steemitimages.com/u/neoxian/avatar/large';
const NEOXIAN_HIVE = 'https://images.hive.blog/u/neoxian/avatar/large';

const BUSY_IPFS =
  'https://ipfs.busy.org/ipfs/QmQ2G2GCrBVmwAQ8J6RCKZRrsXWByWAB6NGNaS6hCGa7go';

const SEAFOOD_HIVE_RESIZE =
  'https://images.hive.blog/1280x0/https://ipfs.busy.org/ipfs/QmZuJeTy6u251Bcaeqa16fWUFxhJxzFoUzj5DuJxM3PAYA';

describe('stripHiveImageProxyPrefix', () => {
  it('removes 0x0 prefix', () => {
    expect(stripHiveImageProxyPrefix(`https://images.hive.blog/0x0/${BUSY_IPFS}`)).toBe(
      BUSY_IPFS,
    );
  });

  it('leaves non-proxied URLs unchanged', () => {
    expect(stripHiveImageProxyPrefix(BUSY_IPFS)).toBe(BUSY_IPFS);
  });
});

describe('getProxyImageUrl', () => {
  it('proxies dead ipfs.busy.org URLs', () => {
    expect(getProxyImageUrl(BUSY_IPFS)).toBe(
      `https://images.hive.blog/0x0/${BUSY_IPFS}`,
    );
  });

  it('is idempotent for already-proxied external URLs', () => {
    const once = getProxyImageUrl(BUSY_IPFS);
    expect(getProxyImageUrl(once)).toBe(once);
  });

  it('double-wraps broken Hive resize URLs (1280x0/…)', () => {
    expect(getProxyImageUrl(SEAFOOD_HIVE_RESIZE)).toBe(
      `https://images.hive.blog/0x0/${SEAFOOD_HIVE_RESIZE}`,
    );
  });

  it('is idempotent for already double-proxied Hive resize URLs', () => {
    const once = getProxyImageUrl(SEAFOOD_HIVE_RESIZE);
    expect(getProxyImageUrl(once)).toBe(once);
  });

  it('normalizes protocol-relative URLs before proxying', () => {
    expect(getProxyImageUrl('//cdn.example.com/a.jpg')).toBe(
      'https://images.hive.blog/0x0/https://cdn.example.com/a.jpg',
    );
  });

  it('skips Hive avatar paths', () => {
    const hive = 'https://images.hive.blog/u/bob/avatar/small';
    expect(getProxyImageUrl(hive)).toBe(hive);
  });

  it('skips direct Hive CDN asset paths (non-resize)', () => {
    const asset = 'https://images.hive.blog/DQmExample/preview.png';
    expect(getProxyImageUrl(asset)).toBe(asset);
  });

  it('skips digitaloceanspaces', () => {
    const spaces =
      'https://waivio.nyc3.digitaloceanspaces.com/1562259409_21fe03f2-3f79-4b89-9dc9-aac5e142750b';
    expect(getProxyImageUrl(spaces)).toBe(spaces);
  });

  it('skips i.imgur.com', () => {
    const imgur = 'https://i.imgur.com/abc.png';
    expect(getProxyImageUrl(imgur)).toBe(imgur);
  });

  it('skips .avif URLs', () => {
    const avif = 'https://cdn.example.com/photo.avif';
    expect(getProxyImageUrl(avif)).toBe(avif);
  });

  it('skips Vimeo vumbnail posters (Hive 0x0 returns 403)', () => {
    const thumb = 'https://vumbnail.com/375137471.jpg';
    expect(getProxyImageUrl(thumb)).toBe(thumb);
    expect(getImagePathPost(thumb)).toBe(thumb);
  });

  it('skips YouTube poster CDNs', () => {
    const yt = 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg';
    expect(getProxyImageUrl(yt)).toBe(yt);
  });

  it('skips Google Shopping gstatic thumbnails (Hive 0x0 returns 403)', () => {
    const gstatic =
      'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcExample&usqp=CAY';
    expect(getProxyImageUrl(gstatic)).toBe(gstatic);
    expect(getImagePathPost(gstatic)).toBe(gstatic);
  });

  it('skips steemitimages.com avatars (Hive 0x0 returns 403)', () => {
    expect(getProxyImageUrl(NEOXIAN_STEEMIT)).toBe(NEOXIAN_STEEMIT);
    expect(getImagePathPost(NEOXIAN_STEEMIT)).toBe(NEOXIAN_STEEMIT);
  });

  it('rewrites dead steemitimages resize proxies onto images.hive.blog', () => {
    const ipfs =
      'https://steemitimages.com/640x0/https://ipfs.busy.org/ipfs/QmTo8opLZykpxLng6yxpgn5Aco5SDhrVMHVM4inZT1SxHE';
    const rewritten =
      'https://images.hive.blog/640x0/https://ipfs.busy.org/ipfs/QmTo8opLZykpxLng6yxpgn5Aco5SDhrVMHVM4inZT1SxHE';
    expect(getProxyImageUrl(ipfs)).toBe(
      `https://images.hive.blog/0x0/${rewritten}`,
    );
    expect(getImagePathPost(ipfs)).toBe(
      `https://images.hive.blog/0x0/${rewritten}`,
    );
  });

  it('rewrites the outer host and leaves an inner cdn.steemitimages.com URL unwrapped', () => {
    const nested =
      'https://steemitimages.com/640x0/https://cdn.steemitimages.com/DQmSFmABdN8qJzZybCo7uqPnehUJ7vCDzmEWPpgAhjm9L7U/ragulla%202.jpg';
    const rewritten =
      'https://images.hive.blog/640x0/https://cdn.steemitimages.com/DQmSFmABdN8qJzZybCo7uqPnehUJ7vCDzmEWPpgAhjm9L7U/ragulla%202.jpg';
    expect(getProxyImageUrl(nested)).toBe(rewritten);
    expect(getImagePathPost(nested)).toBe(rewritten);
  });

  it('leaves direct steemitimages DQm assets on the original host', () => {
    const direct =
      'https://steemitimages.com/DQmSFmABdN8qJzZybCo7uqPnehUJ7vCDzmEWPpgAhjm9L7U/ragulla%202.jpg';
    expect(getProxyImageUrl(direct)).toBe(direct);
    expect(getImagePathPost(direct)).toBe(direct);
  });

  it('skips first-party ipfs-gateway content image URLs (Hive 0x0 returns 403)', () => {
    const ipfs =
      'https://waiviodev.com/ipfs-gateway/content/image/QmYJAscm8HHYEK2VrU1gZT9YaDoPPmGQArH3yyAVuki3mX';
    expect(getProxyImageUrl(ipfs)).toBe(ipfs);
    expect(getImagePathPost(ipfs)).toBe(ipfs);
    expect(resolveObjectImageUrl(ipfs)).toBe(ipfs);
  });

  it('leaves empty, data:, and relative paths unchanged', () => {
    expect(getProxyImageUrl('')).toBe('');
    expect(getProxyImageUrl(null)).toBe('');
    expect(getProxyImageUrl('data:image/png;base64,abc')).toBe(
      'data:image/png;base64,abc',
    );
    expect(getProxyImageUrl('/images/avatar-placeholder.webp')).toBe(
      '/images/avatar-placeholder.webp',
    );
  });
});

describe('getImagePathPost', () => {
  it('proxies non-Spaces URLs', () => {
    expect(getImagePathPost(BUSY_IPFS)).toBe(
      `https://images.hive.blog/0x0/${BUSY_IPFS}`,
    );
  });

  it('skips nyc3.digitaloceanspaces without wrapping', () => {
    const spaces =
      'https://waivio.nyc3.digitaloceanspaces.com/1562259409_21fe03f2-3f79-4b89-9dc9-aac5e142750b';
    expect(getImagePathPost(spaces)).toBe(spaces);
  });

  it('double-wraps Hive resize thumbnails for feed preview', () => {
    expect(getImagePathPost(SEAFOOD_HIVE_RESIZE)).toBe(
      `https://images.hive.blog/0x0/${SEAFOOD_HIVE_RESIZE}`,
    );
  });
});

describe('normalizeLegacyObjectImageUrl', () => {
  it('rewrites steemitimages avatar URLs to Hive CDN', () => {
    expect(normalizeLegacyObjectImageUrl(NEOXIAN_STEEMIT)).toBe(NEOXIAN_HIVE);
  });

  it('rewrites cdn.steemitimages.com avatars', () => {
    expect(
      normalizeLegacyObjectImageUrl(
        'https://cdn.steemitimages.com/u/alice/avatar/small',
      ),
    ).toBe('https://images.hive.blog/u/alice/avatar/small');
  });

  it('leaves unrelated URLs unchanged', () => {
    expect(normalizeLegacyObjectImageUrl(BUSY_IPFS)).toBe(BUSY_IPFS);
  });
});

describe('resolveObjectImageUrl', () => {
  it('normalizes steemitimages then skips 0x0 proxy', () => {
    expect(resolveObjectImageUrl(NEOXIAN_STEEMIT)).toBe(NEOXIAN_HIVE);
  });

  it('returns null for empty input', () => {
    expect(resolveObjectImageUrl(null)).toBeNull();
    expect(resolveObjectImageUrl('  ')).toBeNull();
  });
});

describe('getPreviewProxyImageUrl', () => {
  it('returns legacy 800x600/p/ preview prefix', () => {
    const preview = getPreviewProxyImageUrl(NEOXIAN_HIVE);
    expect(preview.startsWith('https://images.hive.blog/800x600/https://images.hive.blog/p/')).toBe(
      true,
    );
    expect(preview.length).toBeGreaterThan(60);
  });

  it('is idempotent for already-preview URLs', () => {
    const once = getPreviewProxyImageUrl(NEOXIAN_HIVE);
    expect(getPreviewProxyImageUrl(once)).toBe(once);
  });
});
