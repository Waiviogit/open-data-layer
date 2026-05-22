'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { ObjectCard } from '@/modules/feed/presentation/components/object-card';
import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import type { SocialProjectedObjectView } from '@/modules/user-social/application/dto/user-social.dto';

import { fetchDiscoverObjects } from '../../infrastructure/discover.client';

const PAGE_LIMIT = 20;

export type DiscoverObjectFeedProps = {
  objectType: string;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

export function DiscoverObjectFeed({
  objectType,
  q,
  tags,
  sort,
  viewerUsername,
  onRequireLogin,
}: DiscoverObjectFeedProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<SocialProjectedObjectView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (nextCursor: string | null, replace: boolean, signal: AbortSignal) => {
      const page = await fetchDiscoverObjects({
        objectType,
        q: q || undefined,
        tags,
        sort,
        cursor: nextCursor,
        limit: PAGE_LIMIT,
        signal,
      });
      if (signal.aborted || !page) {
        return;
      }
      setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    },
    [objectType, q, tags, sort],
  );

  useEffect(() => {
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
  }, [loadPage]);

  return (
    <section>
      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="h-24 animate-pulse rounded-card border border-border bg-surface-control"
              aria-hidden
            />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-fg-secondary">{t('discover_no_results')}</p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {items.map((o) => (
              <ObjectCard
                key={o.object_id}
                object={o as unknown as ProjectedObjectView}
                viewerUsername={viewerUsername}
                onRequireLogin={onRequireLogin}
              />
            ))}
          </ul>
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={pending}
                className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-medium text-fg hover:bg-surface-control-hover disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const ac = new AbortController();
                    await loadPage(cursor, false, ac.signal);
                  });
                }}
              >
                {pending ? t('discover_loading') : t('discover_show_more')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
