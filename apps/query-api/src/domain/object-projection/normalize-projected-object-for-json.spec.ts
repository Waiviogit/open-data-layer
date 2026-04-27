import { normalizeProjectedObjectForJson } from './normalize-projected-object-for-json';
import type { ProjectedObject } from './projected-object.types';

describe('normalizeProjectedObjectForJson', () => {
  it('fills omitted JSON keys so stringify preserves shape', () => {
    const loose = {
      object_id: 'x',
      object_type: undefined,
      semantic_type: undefined,
      fields: undefined,
      hasAdministrativeAuthority: undefined,
      hasOwnershipAuthority: undefined,
    } as unknown as ProjectedObject;

    const n = normalizeProjectedObjectForJson(loose);
    const json = JSON.parse(JSON.stringify(n)) as Record<string, unknown>;

    expect(json.object_id).toBe('x');
    expect(json.object_type).toBe('');
    expect(json.semantic_type).toBeNull();
    expect(json.fields).toEqual({});
    expect(json.hasAdministrativeAuthority).toBe(false);
    expect(json.hasOwnershipAuthority).toBe(false);
    expect(json.seo).toBeUndefined();
  });

  it('normalizes seo when present', () => {
    const n = normalizeProjectedObjectForJson({
      object_id: 'y',
      object_type: 'recipe',
      semantic_type: null,
      fields: {},
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
      seo: {
        title: undefined as unknown as null,
        description: null,
        canonical_url: 'https://example.com/o/y',
        json_ld: undefined as unknown as Record<string, unknown>,
      },
    });

    expect(n.seo).toEqual({
      title: null,
      description: null,
      canonical_url: 'https://example.com/o/y',
      json_ld: {},
    });
  });
});
