import Link from 'next/link';

import type { CategoryNavData } from '../../domain/types/category-nav';
import { getCategoryNav } from '../../infrastructure/clients/categories.client';
import { apiNavContextFromLineage, UNCATEGORIZED_SHOP_PATH_SEGMENT } from './category-nav-path';
import { CategoryNavList } from './category-nav-list';

export type CategoryNavProps = {
  accountName: string;
  types: readonly string[];
  /** Public profile path prefix, e.g. `/@alice/user-shop` */
  basePath: string;
  sectionKey: 'user-shop' | 'recipe';
  /** Decoded category segments from the URL (full lineage for this view). */
  lineageSegments: string[];
};

function EmptyState() {
  return <p className="mt-2 text-sm text-muted">No categories yet.</p>;
}

function NavChrome({
  data,
  basePath,
  sectionKey,
  lineageSegments,
}: {
  data: CategoryNavData;
  basePath: string;
  sectionKey: 'user-shop' | 'recipe';
  lineageSegments: string[];
}) {
  const upHref =
    lineageSegments.length <= 1
      ? basePath
      : `${basePath}/${lineageSegments
          .slice(0, -1)
          .map((s) => encodeURIComponent(s))
          .join('/')}`;

  return (
    <>
      {lineageSegments.length > 0 ? (
        <p className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <Link
            href={upHref}
            className="text-muted underline-offset-2 hover:text-fg hover:underline"
          >
            ← Up
          </Link>
          <Link
            href={basePath}
            className="text-muted underline-offset-2 hover:text-fg hover:underline"
          >
            All categories
          </Link>
        </p>
      ) : null}
      {!data || data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <CategoryNavList items={data.items} basePath={basePath} sectionKey={sectionKey} />
      )}
      {data && data.uncategorized_count > 0 ? (
        <Link
          href={`${basePath}/${encodeURIComponent(UNCATEGORIZED_SHOP_PATH_SEGMENT)}`}
          className={[
            'mt-3 block border-t border-border pt-2 text-xs underline-offset-2 hover:text-fg hover:underline',
            lineageSegments.length === 1 && lineageSegments[0] === UNCATEGORIZED_SHOP_PATH_SEGMENT
              ? 'font-medium text-fg'
              : 'text-muted',
          ].join(' ')}
          aria-current={
            lineageSegments.length === 1 && lineageSegments[0] === UNCATEGORIZED_SHOP_PATH_SEGMENT
              ? 'page'
              : undefined
          }
        >
          Uncategorized
        </Link>
      ) : null}
    </>
  );
}

export async function CategoryNav({
  accountName,
  types,
  basePath,
  sectionKey,
  lineageSegments,
}: CategoryNavProps) {
  const { parentName, path } = apiNavContextFromLineage(lineageSegments);

  const data = await getCategoryNav(accountName, types, {
    name: parentName,
    path,
  });

  return (
    <aside
      className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted"
      aria-label="Categories"
    >
      <p className="font-medium text-fg">Categories</p>
      {data === null ? (
        <p className="mt-2 text-sm text-muted">Categories unavailable.</p>
      ) : (
        <NavChrome
          data={data}
          basePath={basePath}
          sectionKey={sectionKey}
          lineageSegments={lineageSegments}
        />
      )}
    </aside>
  );
}
