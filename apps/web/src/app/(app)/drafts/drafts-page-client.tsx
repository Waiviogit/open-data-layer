'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import {
  bulkDeleteUserDraftsAction,
  listUserDraftsAction,
} from '@/modules/editor/infrastructure/drafts.actions';
import type { UserPostDraftApiView } from '@/modules/editor/infrastructure/user-post-draft-api.types';
import { HydrationSafeRelativeTime } from '@/modules/editor/presentation';

export type DraftsPageClientProps = {
  username: string;
};

export function DraftsPageClient({ username }: DraftsPageClientProps) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<UserPostDraftApiView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (nextCursor: string | null, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const r = await listUserDraftsAction(username, {
        limit: 20,
        cursor: nextCursor,
      });
      if (r.ok) {
        setItems((prev) =>
          append ? [...prev, ...r.value.items] : r.value.items,
        );
        setCursor(r.value.cursor);
        setHasMore(r.value.hasMore);
      }
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    },
    [username],
  );

  useEffect(() => {
    void load(null, false);
  }, [load]);

  const allIds = useMemo(() => items.map((i) => i.draftId), [items]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0 || deleting) {
      return;
    }
    setDeleting(true);
    const r = await bulkDeleteUserDraftsAction(username, [...selected]);
    setDeleting(false);
    if (r.ok) {
      setSelected(new Set());
      void load(null, false);
    }
  };

  const deleteOne = async (id: string) => {
    if (deleting) {
      return;
    }
    setDeleting(true);
    const r = await bulkDeleteUserDraftsAction(username, [id]);
    setDeleting(false);
    if (r.ok) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      void load(null, false);
    }
  };

  return (
    <main className="mx-auto max-w-container-content px-gutter py-section-y sm:px-gutter-sm">
      <header className="mb-8">
        <h1 className="font-display text-section text-heading leading-display">
          {t('drafts_page_title')}
        </h1>
        <p className="mt-2 max-w-container-narrow text-body text-fg-secondary">
          {t('drafts_page_subtitle')}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 font-label text-body-sm text-fg">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="size-4 rounded border-border text-accent"
            disabled={loading || items.length === 0}
          />
          {t('drafts_select_all')}
        </label>
        <button
          type="button"
          onClick={() => void deleteSelected()}
          disabled={selected.size === 0 || deleting || loading}
          className={[
            'inline-flex items-center gap-1 rounded-btn px-3 py-1.5 font-label text-body-sm',
            'text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        >
          {t('drafts_delete_selected')}
        </button>
      </div>

      {loading ? (
        <p className="text-body text-fg-secondary">{t('drafts_loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-body text-fg-secondary">{t('drafts_empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((d) => {
            const titleLabel =
              d.title.trim() !== '' ? d.title : t('drafts_untitled');
            return (
              <li
                key={d.draftId}
                className="rounded-card border border-border bg-surface p-card-padding shadow-card"
              >
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(d.draftId)}
                    onChange={() => toggleOne(d.draftId)}
                    className="mt-1 size-4 shrink-0 rounded border-border text-accent"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/editor?draftId=${encodeURIComponent(d.draftId)}`}
                      suppressHydrationWarning
                      className="font-display text-body-lg text-heading hover:text-link"
                    >
                      {titleLabel}
                    </Link>
                    <p className="mt-1 text-caption text-fg-tertiary">
                      {t('drafts_last_updated')}{' '}
                      <HydrationSafeRelativeTime
                        locale={locale}
                        lastUpdatedMs={d.lastUpdated}
                        className="text-fg-secondary"
                      />
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteOne(d.draftId)}
                    disabled={deleting}
                    className="shrink-0 self-start rounded-btn px-2 py-1 font-label text-body-sm text-error hover:bg-error/10 disabled:opacity-50"
                  >
                    {t('drafts_delete_one')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => void load(cursor, true)}
            disabled={loadingMore || loading}
            className="rounded-btn border border-border bg-secondary px-4 py-2 font-label text-body-sm text-secondary-fg hover:bg-tertiary disabled:opacity-50"
          >
            {loadingMore ? t('drafts_loading') : t('drafts_load_more')}
          </button>
        </div>
      ) : null}
    </main>
  );
}
