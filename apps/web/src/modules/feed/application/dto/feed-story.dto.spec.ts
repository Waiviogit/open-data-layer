import { projectedObjectViewSchema } from './feed-story.dto';

const shopObject = {
  object_id: 'prod-1',
  object_type: 'product',
  semantic_type: null,
  weight: 1,
  fields: { name: 'Widget' },
};

const amazonLink = {
  link: 'https://www.amazon.com/dp/B000',
  image: 'https://cdn.example/a.png',
  type: 'amazon',
};

describe('projectedObjectViewSchema affiliateLinks', () => {
  it('keeps affiliateLinks on a shop-shaped parse', () => {
    const parsed = projectedObjectViewSchema.parse({
      ...shopObject,
      affiliateLinks: [amazonLink],
    });

    expect(parsed.affiliateLinks).toEqual([amazonLink]);
  });

  it('accepts required fields without optional affiliateCode or objectId', () => {
    const parsed = projectedObjectViewSchema.parse({
      ...shopObject,
      affiliateLinks: [amazonLink],
    });

    expect(parsed.affiliateLinks?.[0]).toEqual({
      link: amazonLink.link,
      image: amazonLink.image,
      type: amazonLink.type,
    });
    expect(parsed.affiliateLinks?.[0]?.affiliateCode).toBeUndefined();
    expect(parsed.affiliateLinks?.[0]?.objectId).toBeUndefined();
  });

  it('still parses when affiliateLinks is omitted', () => {
    const parsed = projectedObjectViewSchema.parse(shopObject);

    expect(parsed.affiliateLinks).toBeUndefined();
  });
});
