import {
  AFFILIATE_MERCHANT_SVG,
  parseAffiliateLinks,
  resolveAffiliateLinkVisual,
  resolveAffiliateLinkVisuals,
} from './affiliate-link-visual';

describe('resolveAffiliateLinkVisual', () => {
  it('prefers the API image over a bundled SVG', () => {
    const visual = resolveAffiliateLinkVisual({
      link: 'https://www.amazon.com/dp/B000',
      image: 'https://cdn.example/logo.png',
      type: 'amazon',
    });

    expect(visual).toEqual({
      href: 'https://www.amazon.com/dp/B000',
      imageSrc: 'https://cdn.example/logo.png',
      type: 'amazon',
      isAmazon: true,
    });
  });

  it('uses the amazon SVG when image is empty', () => {
    const visual = resolveAffiliateLinkVisual({
      link: 'https://www.amazon.com/dp/B000',
      image: '',
      type: 'amazon',
    });

    expect(visual?.imageSrc).toBe(AFFILIATE_MERCHANT_SVG.amazon);
    expect(visual?.href).toBe('https://www.amazon.com/dp/B000');
  });

  it('skips an item with no image and an unknown merchant', () => {
    expect(
      resolveAffiliateLinkVisual({
        link: 'https://unknown.example/p/1',
        image: '',
        type: 'other',
      }),
    ).toBeNull();
  });

  it('falls back from the URL host when type is empty', () => {
    expect(
      resolveAffiliateLinkVisual({
        link: 'https://www.amazon.com/dp/B000',
        image: '',
        type: '',
      })?.imageSrc,
    ).toBe(AFFILIATE_MERCHANT_SVG.amazon);
    expect(
      resolveAffiliateLinkVisual({
        link: 'https://www.walmart.com/ip/1',
        image: '',
        type: '',
      })?.imageSrc,
    ).toBe(AFFILIATE_MERCHANT_SVG.walmart);
    expect(
      resolveAffiliateLinkVisual({
        link: 'https://www.target.com/p/1',
        image: '',
        type: '',
      })?.imageSrc,
    ).toBe(AFFILIATE_MERCHANT_SVG.target);
  });

  it('uses walmart and target SVGs from explicit type', () => {
    expect(
      resolveAffiliateLinkVisual({
        link: 'https://www.walmart.com/ip/1',
        image: '',
        type: 'walmart',
      })?.imageSrc,
    ).toBe(AFFILIATE_MERCHANT_SVG.walmart);
    expect(
      resolveAffiliateLinkVisual({
        link: 'https://www.target.com/p/1',
        image: '',
        type: 'target',
      })?.imageSrc,
    ).toBe(AFFILIATE_MERCHANT_SVG.target);
  });
});

describe('resolveAffiliateLinkVisuals', () => {
  it('keeps every renderable link and drops the unrenderable sibling', () => {
    const items = resolveAffiliateLinkVisuals([
      { link: 'https://unknown.example/p/1', image: '', type: 'other' },
      { link: 'https://www.amazon.com/dp/B000', image: '', type: 'amazon' },
      {
        link: 'https://www.walmart.com/ip/1',
        image: 'https://cdn.example/w.png',
        type: 'walmart',
      },
    ]);

    expect(items).toEqual([
      {
        href: 'https://www.amazon.com/dp/B000',
        imageSrc: AFFILIATE_MERCHANT_SVG.amazon,
        type: 'amazon',
        isAmazon: true,
      },
      {
        href: 'https://www.walmart.com/ip/1',
        imageSrc: 'https://cdn.example/w.png',
        type: 'walmart',
        isAmazon: false,
      },
    ]);
  });
});

describe('parseAffiliateLinks', () => {
  it('reads root-level affiliate rows and skips items without a link', () => {
    expect(
      parseAffiliateLinks([
        { link: 'https://www.amazon.com/dp/B000', image: '', type: 'amazon' },
        { image: 'https://cdn.example/a.png', type: 'amazon' },
      ]),
    ).toEqual([{ link: 'https://www.amazon.com/dp/B000', image: '', type: 'amazon' }]);
  });
});
