import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import {
  getSupposedTagCategoryNames,
  pickMaterializedTagItems,
} from './pick-materialized-tag-items';

function viewWithItems(
  items: Array<{ category: string; value: string }>,
): ResolvedObjectView {
  return {
    object_id: 'o1',
    object_type: 'restaurant',
    creator: 'alice',
    weight: null,
    meta_group_id: null,
    canonical: null,
    fields: {
      [UPDATE_TYPES.TAG_CATEGORY_ITEM]: {
        update_type: UPDATE_TYPES.TAG_CATEGORY_ITEM,
        cardinality: 'multi',
        values: items.map((item, i) => ({
          update_id: `u${i}`,
          update_type: UPDATE_TYPES.TAG_CATEGORY_ITEM,
          creator: 'alice',
          locale: null,
          created_at_unix: 1000 + i,
          event_seq: BigInt(i),
          value_text: null,
          value_geo: null,
          value_json: item,
          validity_status: 'VALID',
          validity_tier: 'baseline',
          decisive_vote_event_seq: null,
          approve_percent: 100,
          field_weight: null,
          rank_score: null,
          rank_context: null,
          rank_decisive_event_seq: null,
        })),
      },
    },
  };
}

describe('pickMaterializedTagItems', () => {
  it('returns items only for allowed categories up to max per category', () => {
    const allowed = getSupposedTagCategoryNames('restaurant');
    const items = pickMaterializedTagItems(
      viewWithItems([
        { category: 'Cuisine', value: 'Asian' },
        { category: 'Cuisine', value: 'Italian' },
        { category: 'Features', value: 'Outdoor' },
        { category: 'Unknown', value: 'X' },
      ]),
      allowed,
      10,
    );
    expect(items).toEqual([
      { category: 'Cuisine', value: 'Asian' },
      { category: 'Cuisine', value: 'Italian' },
      { category: 'Features', value: 'Outdoor' },
    ]);
  });

  it('caps at maxPerCategory per category', () => {
    const allowed = new Set(['Cuisine']);
    const many = Array.from({ length: 12 }, (_, i) => ({
      category: 'Cuisine',
      value: `Tag${i}`,
    }));
    const items = pickMaterializedTagItems(viewWithItems(many), allowed, 10);
    expect(items).toHaveLength(10);
    expect(items.every((x) => x.category === 'Cuisine')).toBe(true);
  });
});
