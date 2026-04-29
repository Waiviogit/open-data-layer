import { ROOT_DEPARTMENTS_LIMIT } from './category-navigation.constants';
import type { CategoryNavigationRow } from './category-navigation.types';

/** Root list: greedy suppress names dominated by stronger rows; cap at `ROOT_DEPARTMENTS_LIMIT`. */
export function filterRootDepartments(rows: CategoryNavigationRow[]): {
  items: CategoryNavigationRow[];
  show_other: boolean;
} {
  const sorted = [...rows].sort((a, b) => b.objects_count - a.objects_count);
  const accepted: CategoryNavigationRow[] = [];
  for (const cat of sorted) {
    const dominated = accepted.some((acc) =>
      acc.related_names.includes(cat.category_name),
    );
    if (!dominated) {
      accepted.push(cat);
    }
  }
  const show_other = accepted.length > ROOT_DEPARTMENTS_LIMIT;
  const items = accepted.slice(0, ROOT_DEPARTMENTS_LIMIT);
  return { items, show_other };
}
