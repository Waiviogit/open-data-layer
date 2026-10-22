import { discoverObjectsPageSchema } from './discover-response.schema';

const BASE_ITEM = {
  object_id: 'ijw-exotac-firesleeve',
  object_type: 'product',
  semantic_type: null,
  fields: { name: 'Exotac firesleeve' },
};

const AFFILIATE_LINKS = [
  {
    type: 'amazon.com',
    link: 'https://www.amazon.com/dp/B0X/ref=nosim?tag=waivious-20',
    image: 'https://img/amazon.png',
    affiliateCode: 'waivious-20',
  },
];

describe('discoverObjectsPageSchema', () => {
  it('preserves affiliateLinks on an item', () => {
    const parsed = discoverObjectsPageSchema.parse({
      items: [{ ...BASE_ITEM, affiliateLinks: AFFILIATE_LINKS }],
      cursor: null,
      hasMore: false,
    });
    expect(parsed.items[0].affiliateLinks).toEqual(AFFILIATE_LINKS);
  });

  it('parses an item without affiliateLinks', () => {
    const parsed = discoverObjectsPageSchema.parse({
      items: [BASE_ITEM],
      cursor: null,
      hasMore: false,
    });
    expect(parsed.items[0].affiliateLinks).toBeUndefined();
  });

  it('preserves an empty affiliateLinks array', () => {
    const parsed = discoverObjectsPageSchema.parse({
      items: [{ ...BASE_ITEM, affiliateLinks: [] }],
      cursor: null,
      hasMore: false,
    });
    expect(parsed.items[0].affiliateLinks).toEqual([]);
  });
});
