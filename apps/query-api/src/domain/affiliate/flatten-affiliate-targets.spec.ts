import { flattenAffiliateTargets } from './flatten-affiliate-targets';

describe('flattenAffiliateTargets', () => {
  it('flattens the parent and one-level listItem children', () => {
    const parent = {
      object_id: 'list-1',
      object_type: 'list',
      fields: {
        listItem: [
          {
            object_id: 'c1',
            object_type: 'product',
            fields: { identifier: [{ value: 'B001', type: 'asin' }] },
          },
          {
            object_id: 'c2',
            object_type: 'product',
            fields: { identifier: [{ value: 'B002', type: 'asin' }] },
          },
        ],
      },
    };
    const targets = flattenAffiliateTargets([parent]);
    expect(targets.map((t) => t.object_id)).toEqual(['list-1', 'c1', 'c2']);
  });

  it('does not include grandchildren', () => {
    const grandchild = {
      object_id: 'g1',
      object_type: 'product',
      fields: { identifier: [{ value: 'G', type: 'asin' }] },
    };
    const child = {
      object_id: 'c1',
      object_type: 'product',
      fields: {
        identifier: [{ value: 'B001', type: 'asin' }],
        parent: grandchild,
      },
    };
    const parent = {
      object_id: 'list-1',
      object_type: 'list',
      fields: { listItem: [child] },
    };
    const targets = flattenAffiliateTargets([parent]);
    expect(targets.map((t) => t.object_id)).toEqual(['list-1', 'c1']);
  });
});
