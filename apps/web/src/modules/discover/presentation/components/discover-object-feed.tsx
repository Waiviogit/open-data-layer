'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { ObjectCard } from '@/modules/feed/presentation/components/object-card';
import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import type { SocialProjectedObjectView } from '@/modules/user-social/application/dto/user-social.dto';
import { FeedColumn } from '@/shared/presentation/layout';
import { useInfiniteScroll } from '@/shared/presentation';
import { isScrollRestorePending } from '@/shared/presentation/navigation/scroll-memory';

import type { DiscoverBox } from '../../domain/discover-url';
import { fetchDiscoverObjects } from '../../infrastructure/discover.client';
import {
  discoverFeedCacheKey,
  readDiscoverFeedCache,
  writeDiscoverFeedCache,
} from '../../infrastructure/discover-feed-cache';

const PAGE_LIMIT = 20;

export type DiscoverObjectFeedProps = {
  objectType: string;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
  box: DiscoverBox | null;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
  hideType?: boolean;
};

export function DiscoverObjectFeed({
  objectType,
  q,
  tags,
  sort,
  box,
  viewerUsername,
  onRequireLogin,
  hideType = false,
}: DiscoverObjectFeedProps) {
  const { t } = useI18n();
  const cacheKey = discoverFeedCacheKey({ objectType, q, tags, sort, box });
  const [cachedOnRestore] = useState(() =>
    isScrollRestorePending() ? readDiscoverFeedCache(cacheKey) : null,
  );
  const skipInitialFetch = useRef(cachedOnRestore != null);
  const [items, setItems] = useState<SocialProjectedObjectView[]>(
    () => cachedOnRestore?.items ?? [],
  );
  const [cursor, setCursor] = useState<string | null>(cachedOnRestore?.cursor ?? null);
  const [hasMore, setHasMore] = useState(cachedOnRestore?.hasMore ?? false);
  const [loading, setLoading] = useState(cachedOnRestore == null);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (nextCursor: string | null, replace: boolean, signal: AbortSignal) => {
      const page = await fetchDiscoverObjects({
        objectType,
        q: q || undefined,
        tags,
        sort,
        box: box ?? undefined,
        cursor: nextCursor,
        limit: PAGE_LIMIT,
        signal,
      });
      if (signal.aborted || !page) {
        return;
      }
      let merged: SocialProjectedObjectView[] = page.items;
      setItems((prev) => {
        merged = replace ? page.items : [...prev, ...page.items];
        return merged;
      });
      writeDiscoverFeedCache(cacheKey, {
        items: merged,
        cursor: page.cursor,
        hasMore: page.hasMore,
      });
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    },
    [cacheKey, objectType, q, tags, sort, box],
  );

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setItems([]);
    setCursor(null);
    setHasMore(false);

    void (async () => {
      await loadPage(null, true, ac.signal);
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    })();

    return () => {
      ac.abort();
    };
  }, [loadPage, objectType, q, tags, sort, box]);

  const onLoadMore = useCallback(() => {
    if (!hasMore || pending || loading) {
      return;
    }
    startTransition(async () => {
      const ac = new AbortController();
      await loadPage(cursor, false, ac.signal);
    });
  }, [cursor, hasMore, loadPage, loading, pending]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: hasMore && !loading,
    isLoading: pending,
    onLoadMore,
  });

  if (loading) {
    return (
      <FeedColumn>
        <ul className="flex flex-col gap-card-padding">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="h-24 animate-pulse rounded-card border border-border bg-surface-control"
              aria-hidden
            />
          ))}
        </ul>
      </FeedColumn>
    );
  }

  if (items.length === 0) {
    return <p className="text-body-sm text-fg-secondary">{t('discover_no_results')}</p>;
  }

  return (
    <FeedColumn>
      <ul className="flex flex-col gap-card-padding">
        {items.map((o) => (
          <ObjectCard
            key={o.object_id}
            object={o as unknown as ProjectedObjectView}
            viewerUsername={viewerUsername}
            onRequireLogin={onRequireLogin}
            hideType={hideType}
          />
        ))}
      </ul>
      {hasMore ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
          <button
            type="button"
            className="sr-only"
            disabled={pending}
            onClick={onLoadMore}
          >
            {t('discover_show_more')}
          </button>
          {pending ? (
            <p className="text-body-sm text-muted" aria-live="polite">
              {t('discover_loading')}
            </p>
          ) : null}
        </div>
      ) : null}
    </FeedColumn>
  );
}
