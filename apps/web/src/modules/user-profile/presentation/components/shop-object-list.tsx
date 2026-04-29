'use client';

import { useState, useTransition } from 'react';

import type { ShopObjectsPage } from '../../domain/types/shop-objects';
import { ObjectCard } from '@/modules/feed/presentation';
import { FeedColumn } from '@/shared/presentation/layout';

import { loadMoreShopObjectsAction } from '@/app/(app)/user-profile/[name]/shop-feed.actions';

export type ShopObjectListProps = {
  accountName: string;
  initialPage: ShopObjectsPage;
  types: readonly string[];
  categoryPath: string[];
  uncategorizedOnly?: boolean;
};

export function ShopObjectList({
  accountName,
  initialPage,
  types,
  categoryPath,
  uncategorizedOnly = false,
}: ShopObjectListProps) {
  const [items, setItems] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.cursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <section
        className="rounded-card border border-border bg-surface/80 p-card-padding"
        aria-labelledby="shop-objects-empty"
      >
        <h2 id="shop-objects-empty" className="text-lg font-semibold text-fg">
          Shop
        </h2>
        <p className="mt-2 text-sm text-muted">No objects in this category yet.</p>
      </section>
    );
  }

  return (
    <FeedColumn>
      <ul className="flex flex-col gap-card-padding">
        {items.map((o) => (
          <ObjectCard key={o.object_id} object={o} />
        ))}
      </ul>
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
                const next = await loadMoreShopObjectsAction(
                  accountName,
                  [...types],
                  [...categoryPath],
                  cursor,
                  uncategorizedOnly ? true : undefined,
                );
                setItems((prev) => [...prev, ...next.items]);
                setCursor(next.cursor);
                setHasMore(next.hasMore);
              });
            }}
          >
            {pending ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </FeedColumn>
  );
}
