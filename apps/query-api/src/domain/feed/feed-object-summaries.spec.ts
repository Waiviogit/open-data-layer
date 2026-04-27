import type { ProjectedObject } from '../object-projection/projected-object.types';
import { sortProjectedObjectsForDisplay } from './feed-object-summaries';

function projected(overrides: Partial<ProjectedObject> = {}): ProjectedObject {
  return {
    object_id: 'a',
    object_type: 'recipe',
    semantic_type: null,
    fields: {},
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
    ...overrides,
  };
}

describe('sortProjectedObjectsForDisplay', () => {
  it('orders by image presence then weight then object_id', () => {
    const out = sortProjectedObjectsForDisplay([
      { projected: projected({ object_id: 'z', fields: {} }), weight: 10 },
      { projected: projected({ object_id: 'a', fields: { image: 'https://x' } }), weight: 0 },
      { projected: projected({ object_id: 'm', fields: {} }), weight: 5 },
    ]);
    expect(out.map((p) => p.object_id)).toEqual(['a', 'z', 'm']);
  });

  it('preserves hasAdministrativeAuthority on projected objects', () => {
    const out = sortProjectedObjectsForDisplay([
      {
        projected: projected({ object_id: 'b', hasAdministrativeAuthority: true }),
        weight: 0,
      },
      { projected: projected({ object_id: 'a' }), weight: 0 },
    ]);
    expect(out.find((o) => o.object_id === 'b')?.hasAdministrativeAuthority).toBe(true);
    expect(out.find((o) => o.object_id === 'a')?.hasAdministrativeAuthority).toBe(false);
  });
});
