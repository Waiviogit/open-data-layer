'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/** Server-provided first page; re-synced after `router.refresh()`. */
export type SyncedPaginatedInitial<TItem> = {
  items: TItem[];
  hasMore: boolean;
  cursor?: string | null;
};

export type SyncedPaginatedListState<TItem> = {
  items: TItem[];
  hasMore: boolean;
  cursor: string | null | undefined;
  setItems: Dispatch<SetStateAction<TItem[]>>;
  setHasMore: Dispatch<SetStateAction<boolean>>;
  setCursor: Dispatch<SetStateAction<string | null | undefined>>;
};

/**
 * Client paginated list state seeded from RSC props.
 * `router.refresh()` updates `initial` but does not reset `useState` — this hook keeps items in sync.
 */
export function useSyncedPaginatedList<TItem>(
  initial: SyncedPaginatedInitial<TItem>,
): SyncedPaginatedListState<TItem> {
  const [items, setItems] = useState(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [cursor, setCursor] = useState(initial.cursor);

  useEffect(() => {
    setItems(initial.items);
    setHasMore(initial.hasMore);
    if (initial.cursor !== undefined) {
      setCursor(initial.cursor);
    }
  }, [initial]);

  return {
    items,
    hasMore,
    cursor,
    setItems,
    setHasMore,
    setCursor,
  };
}
