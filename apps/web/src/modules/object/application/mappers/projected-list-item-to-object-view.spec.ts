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
      hasAdministrativeAuthority: true,
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
    expect(view.hasAdministrativeAuthority).toBe(true);
  });
});
