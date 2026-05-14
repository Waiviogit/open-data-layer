import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import {
  projectedGeoLatLon,
  projectedTagCategorySections,
  projectedMenuItems,
  projectedSortCustom,
  applySortCustomToMenuItems,
} from './object-projected-fields';

function viewWithMenu(
  menuItem: unknown,
  sortCustom: unknown,
): ProjectedObjectView {
  return {
    object_id: 'x',
    object_type: 'business',
    semantic_type: null,
    weight: null,
    fields: { menuItem, sortCustom },
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
  };
}

describe('object-projected-fields', () => {
  it('orders menu items by sortCustom.include then appends the rest', () => {
    const menu = [
      { title: 'A', style: 'default', link_to_web: 'https://a.example' },
      { title: 'B', style: 'default', link_to_web: 'https://b.example' },
      { title: 'C', style: 'highlight', link_to_object: 'ref-c' },
    ];
    const sort = { include: ['B', 'ref-c'], exclude: [] };
    const v = viewWithMenu(menu, sort);
    const items = applySortCustomToMenuItems(projectedMenuItems(v), projectedSortCustom(v));
    expect(items.map((i) => i.title)).toEqual(['B', 'C', 'A']);
  });

  it('excludes menu rows matched by sortCustom.exclude', () => {
    const menu = [
      { title: 'A', style: 'default', link_to_web: 'https://a.example' },
      { title: 'B', style: 'default', link_to_web: 'https://b.example' },
    ];
    const sort = { include: [], exclude: ['https://b.example'] };
    const v = viewWithMenu(menu, sort);
    const items = applySortCustomToMenuItems(projectedMenuItems(v), projectedSortCustom(v));
    expect(items.map((i) => i.title)).toEqual(['A']);
  });

  it('parses geo latitude/longitude from numeric strings', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'place',
      semantic_type: null,
      weight: null,
      fields: { geo: { latitude: '10.5', longitude: '-66.89' } },
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
    };
    expect(projectedGeoLatLon(v)).toEqual({ latitude: 10.5, longitude: -66.89 });
  });

  it('parses GeoJSON Point on geo field', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'place',
      semantic_type: null,
      weight: null,
      fields: {
        geo: { type: 'Point', coordinates: [-66.89, 10.5] },
      },
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
    };
    expect(projectedGeoLatLon(v)).toEqual({ latitude: 10.5, longitude: -66.89 });
  });

  it('groups tag categories and hides empty ones (tagCategory order)', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        tagCategory: ['Pros', 'Cons', 'Test', 'test kate'],
        tagCategoryItem: [
          { value: 'testingdi', category: 'Test' },
          { value: 'automation', category: 'Pros' },
          { value: 'development', category: 'Pros' },
        ],
      },
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
    };
    const sections = projectedTagCategorySections(v);
    expect(sections.map((s) => s.categoryTitle)).toEqual(['Pros', 'Test']);
    expect(sections[0].values).toEqual(['automation', 'development']);
    expect(sections[1].values).toEqual(['testingdi']);
  });
});
