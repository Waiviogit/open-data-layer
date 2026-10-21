import type { ProjectedListItem } from '../../domain/projected-list-item.types';
import { projectedListItemToObjectView } from './projected-list-item-to-object-view';

describe('projectedListItemToObjectView', () => {
  it('maps list item fields for ObjectCard', () => {
    const item: ProjectedListItem = {
      objectId: 'cord-1',
      objectType: 'product',
      name: 'Titan Cord',
      imageUrl: 'https://example.com/cord.jpg',
      weight: 1.5,
      description: 'Long description',
      tagCategoryLabels: ['survival', 'tactical'],
      aggregateRatingAspects: [
        {
          update_id: 'u1',
          dimension: 'Quality',
          averageRating: 6000,
          userRating: null,
          totalVoters: 3,
        },
      ],
      isFavorited: true,
    };

    const view = projectedListItemToObjectView(item);

    expect(view.object_id).toBe('cord-1');
    expect(view.object_type).toBe('product');
    expect(view.fields.name).toBe('Titan Cord');
    expect(view.fields.image).toBe('https://example.com/cord.jpg');
    expect(view.fields.description).toBe('Long description');
    expect(view.fields.tagCategoryItem).toEqual([
      { value: 'survival' },
      { value: 'tactical' },
    ]);
    expect(view.fields.aggregateRating).toEqual([
      {
        update_id: 'u1',
        dimension: 'Quality',
        averageRating: 6000,
        userRating: null,
        totalVoters: 3,
      },
    ]);
    expect(view.isFavorited).toBe(true);
  });

  it('maps price and brand/parent refs for ObjectCard', () => {
    const item: ProjectedListItem = {
      objectId: 'product-1',
      objectType: 'product',
      name: 'Macadamia Tincture',
      imageUrl: null,
      weight: 1,
      price: 'MX$225.00',
      brandRef: {
        objectId: 'brand-1',
        objectType: 'business',
        name: 'Itzayana',
        imageUrl: null,
      },
      parentRef: {
        objectId: 'shop-1',
        objectType: 'shop',
        name: 'Miss Bitcoin Shop',
        imageUrl: null,
      },
    };

    const view = projectedListItemToObjectView(item);

    expect(view.fields.price).toBe('MX$225.00');
    expect(view.fields.brand).toEqual({
      object_id: 'brand-1',
      object_type: 'business',
      fields: { name: 'Itzayana' },
    });
    expect(view.fields.parent).toEqual({
      object_id: 'shop-1',
      object_type: 'shop',
      fields: { name: 'Miss Bitcoin Shop' },
    });
  });

  it('threads affiliateLinks onto the ObjectCard view', () => {
    const item: ProjectedListItem = {
      objectId: 'prod-1',
      objectType: 'product',
      name: 'Widget',
      imageUrl: null,
      weight: 1,
      affiliateLinks: [
        {
          link: 'https://www.amazon.com/dp/B000',
          image: 'https://cdn.example/a.png',
          type: 'amazon',
        },
      ],
    };

    const view = projectedListItemToObjectView(item);

    expect(view.affiliateLinks).toEqual([
      {
        link: 'https://www.amazon.com/dp/B000',
        image: 'https://cdn.example/a.png',
        type: 'amazon',
      },
    ]);
  });
});
