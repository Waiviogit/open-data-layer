import {
  filterSubDepartments,
  hasDescendantBeyondLineage,
} from './level2-filter';
import type { CategoryNavigationRow } from './category-navigation.types';

function nav(
  name: string,
  count: number,
  related: string[],
  groupKeys: string[] = []
): CategoryNavigationRow {
  return {
    category_name: name,
    objects_count: count,
    group_keys: groupKeys,
    related_names: related,
  };
}

describe('filterSubDepartments', () => {
  it('returns empty when no candidate lists parent in related_names', () => {
    expect(
      filterSubDepartments({
        allRows: [nav('Child', 50, [], ['g1'])],
        path: [],
        name: 'Parent',
        excluded: [],
      }),
    ).toEqual([]);
  });

  it('drops a single candidate that dominates share (outside 1%–30% band)', () => {
    expect(
      filterSubDepartments({
        allRows: [nav('OnlyChild', 100, ['Parent'], ['g1'])],
        path: [],
        name: 'Parent',
        excluded: [],
      }),
    ).toEqual([]);
  });
});

describe('hasDescendantBeyondLineage', () => {
  it('returns true when another row matches full lineage prefix on related_names', () => {
    const all = [
      nav('Electronics', 1, [], ['g1']),
      nav('Deep', 1, ['Electronics', 'Audio'], ['g1']),
    ];
    expect(hasDescendantBeyondLineage(all, ['Electronics', 'Audio'])).toBe(true);
  });
});
