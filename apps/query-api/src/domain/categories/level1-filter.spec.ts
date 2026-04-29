import { filterRootDepartments } from './level1-filter';
import type { CategoryNavigationRow } from './category-navigation.types';

function row(
  name: string,
  objectsCount: number,
  related: string[],
): CategoryNavigationRow {
  return {
    category_name: name,
    objects_count: objectsCount,
    group_keys: [],
    related_names: related,
  };
}

describe('filterRootDepartments', () => {
  it('dedupes narrower names dominated by related set of earlier heavy row', () => {
    const { items, show_other } = filterRootDepartments([
      row('Electronics', 100, ['Audio', 'Headphones']),
      row('Headphones', 50, ['Electronics']),
    ]);
    expect(items.map((i) => i.category_name)).toEqual(['Electronics']);
    expect(show_other).toBe(false);
  });

  it('caps at 20 rows and sets show_other when more than 20 accepted', () => {
    const many: CategoryNavigationRow[] = [];
    for (let i = 0; i < 25; i++) {
      many.push(row(`Cat${i}`, 100 - i, []));
    }
    const { items, show_other } = filterRootDepartments(many);
    expect(items.length).toBe(20);
    expect(show_other).toBe(true);
  });
});
