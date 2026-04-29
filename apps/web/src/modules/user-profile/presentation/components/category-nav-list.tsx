'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { CategoryNavItem } from '../../domain/types/category-nav';
import { getCategoryLineageFromPathname } from './category-nav-path';

type CategoryNavListProps = {
  items: CategoryNavItem[];
  /** e.g. `/@alice/user-shop` */
  basePath: string;
  /** `'user-shop'` or `'recipe'` */
  sectionKey: 'user-shop' | 'recipe';
};

export function CategoryNavList({ items, basePath, sectionKey }: CategoryNavListProps) {
  const pathname = usePathname();
  const lineage = getCategoryLineageFromPathname(pathname, sectionKey);
  const prefix =
    lineage.length > 0 ? `${lineage.map((s) => encodeURIComponent(s)).join('/')}/` : '';

  return (
    <ul className="mt-2 list-none space-y-0.5 p-0" role="list">
      {items.map((item) => {
        const href = `${basePath}/${prefix}${encodeURIComponent(item.name)}`;
        const isActive = lineage.length > 0 && lineage[lineage.length - 1] === item.name;
        return (
          <li key={item.name}>
            <Link
              href={href}
              className={[
                'flex items-center justify-between gap-2 rounded-btn px-2 py-1.5 text-sm transition-colors',
                isActive ? 'bg-surface font-medium text-fg' : 'text-muted hover:bg-surface/80 hover:text-fg',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="min-w-0 truncate">{item.name}</span>
              {item.has_children ? (
                <span className="shrink-0 text-muted tabular-nums" aria-hidden>
                  ›
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
