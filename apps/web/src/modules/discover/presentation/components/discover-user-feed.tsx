'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { AVATAR_PLACEHOLDER_SRC, shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import { fetchDiscoverUsers } from '../../infrastructure/discover.client';
import type { DiscoverUsersPage } from '../../domain/discover-response.schema';

const PAGE_LIMIT = 20;

export type DiscoverUserFeedProps = {
  q: string;
};

export function DiscoverUserFeed({ q }: DiscoverUserFeedProps) {
  const { t } = useI18n();
  const [page, setPage] = useState<DiscoverUsersPage>({ items: [], cursor: null, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (cursor: string | null, replace: boolean, signal: AbortSignal) => {
      const next = await fetchDiscoverUsers({
        q: q || undefined,
        cursor,
        limit: PAGE_LIMIT,
        signal,
      });
      if (signal.aborted || !next) {
        return;
      }
      setPage((prev) => ({
        items: replace ? next.items : [...prev.items, ...next.items],
        cursor: next.cursor,
        hasMore: next.hasMore,
      }));
    },
    [q],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setPage({ items: [], cursor: null, hasMore: false });

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

  const { items, cursor, hasMore } = page;

  return (
    <section>
      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="h-14 animate-pulse rounded-btn bg-surface-control"
              aria-hidden
            />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-fg-secondary">{t('discover_no_results')}</p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {items.map((u) => (
              <li key={u.name}>
                <Link
                  href={`/@${encodeURIComponent(u.name)}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-ghost-surface"
                >
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-circle bg-surface-control">
                    {u.profile_image ? (
                      <Image
                        src={u.profile_image}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 object-cover"
                        unoptimized={shouldUnoptimizeRemoteImage(u.profile_image)}
                      />
                    ) : (
                      <Image
                        src={AVATAR_PLACEHOLDER_SRC}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-weight-label text-fg">{u.name}</span>
                    <span className="ms-2 text-caption text-fg-secondary">
                      {u.reputation.toFixed(2)} · {u.followers_count}
                    </span>
                  </span>
                  {u.is_following ? (
                    <span className="text-caption text-fg-secondary">{t('search_user_following')}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={pending}
                className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-weight-label text-fg disabled:opacity-50"
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
