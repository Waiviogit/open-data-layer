'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import type { ShopSectionsPage } from '../../domain/types/shop-objects';
import { ObjectCard } from '@/modules/feed/presentation';
import { FeedColumn } from '@/shared/presentation/layout';

import { loadMoreShopSectionsAction } from '@/app/(app)/user-profile/[name]/shop-feed.actions';

export type ShopSectionsProps = {
  accountName: string;
  initialSections: ShopSectionsPage;
  types: readonly string[];
  basePath: string;
  /** Lineage to current nav node (URL segments). */
  lineageSegments: string[];
  /** Category API drill-down: parent department (undefined at root). */
  navName?: string;
  /** Ancestors before `navName`. */
  navPath: string[];
};

function sectionHref(basePath: string, lineageSegments: string[], categoryName: string): string {
  const segments = [...lineageSegments, categoryName].map((s) => encodeURIComponent(s));
  return `${basePath}/${segments.join('/')}`;
}

export function ShopSections({
  accountName,
  initialSections,
  types,
  basePath,
  lineageSegments,
  navName,
  navPath,
}: ShopSectionsProps) {
  const [sections, setSections] = useState(initialSections.sections);
  const [cursor, setCursor] = useState(initialSections.cursor);
  const [hasMore, setHasMore] = useState(initialSections.hasMore);
  const [pending, startTransition] = useTransition();

  if (sections.length === 0) {
    return (
      <section
        className="rounded-card border border-border bg-surface/80 p-card-padding"
        aria-labelledby="shop-sections-empty"
      >
        <h2 id="shop-sections-empty" className="text-lg font-semibold text-fg">
          Shop
        </h2>
        <p className="mt-2 text-sm text-muted">No categories to show yet.</p>
      </section>
    );
  }

  return (
    <FeedColumn>
      <div className="flex flex-col gap-8">
        {sections.map((sec) => (
          <section
            key={sec.categoryName}
            aria-labelledby={`shop-section-${sec.categoryName}`}
            className="rounded-card border border-border bg-surface/60 p-card-padding"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`shop-section-${sec.categoryName}`} className="text-heading font-label text-body-lg">
                <Link
                  href={sectionHref(basePath, lineageSegments, sec.categoryName)}
                  className="text-fg underline-offset-2 hover:underline"
                >
                  {sec.categoryName}
                </Link>
              </h2>
              <p className="text-caption text-fg-secondary tabular-nums">
                {sec.totalObjects} object{sec.totalObjects === 1 ? '' : 's'}
              </p>
            </div>
            {sec.items.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No preview items.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-card-padding">
                {sec.items.map((o) => (
                  <ObjectCard key={`${sec.categoryName}-${o.object_id}`} object={o} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-medium text-fg hover:bg-surface-control-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
            disabled={pending || !cursor}
            onClick={() => {
              if (!cursor) {
                return;
              }
              startTransition(async () => {
                const next = await loadMoreShopSectionsAction(
                  accountName,
                  [...types],
                  navName,
                  [...navPath],
                  cursor,
                );
                setSections((prev) => [...prev, ...next.sections]);
                setCursor(next.cursor);
                setHasMore(next.hasMore);
              });
            }}
          >
            {pending ? 'Loading…' : 'Load more sections'}
          </button>
        </div>
      ) : null}
    </FeedColumn>
  );
}
