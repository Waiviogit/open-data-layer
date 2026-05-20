'use client';

import { useState, useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useLoginModal } from '@/modules/auth';

import type { ObjectUpdateFeedItemView } from '../../application/dto/object-updates-feed.dto';
import type { ObjectUpdatesUrlFilters } from '../../application/parse-object-updates-search-params';
import { useEffectiveViewerUsername } from '../../application/use-effective-viewer-username';

import { AddUpdateModal } from './add-update-modal';
import { ObjectUpdatesFilterBar, type UpdateTypeOption } from './update-filter-bar';
import { UpdateCard } from './update-card';

function mergeUniqueByUpdateId(
  prev: ObjectUpdateFeedItemView[],
  more: ObjectUpdateFeedItemView[],
): ObjectUpdateFeedItemView[] {
  const seen = new Set(prev.map((i) => i.update_id));
  const out = [...prev];
  for (const item of more) {
    if (!seen.has(item.update_id)) {
      seen.add(item.update_id);
      out.push(item);
    }
  }
  return out;
}

export type LoadMoreObjectUpdatesFn = (
  objectId: string,
  filters: ObjectUpdatesUrlFilters,
  cursor: string | null,
) => Promise<{
  items: ObjectUpdateFeedItemView[];
  cursor: string | null;
  hasMore: boolean;
}>;

export type ObjectUpdatesFeedProps = {
  objectId: string;
  initialItems: ObjectUpdateFeedItemView[];
  initialCursor: string | null;
  initialHasMore: boolean;
  filters: ObjectUpdatesUrlFilters;
  typeOptions: UpdateTypeOption[];
  showLocaleFilter: boolean;
  localizableTypes: string[];
  loadMoreAction: LoadMoreObjectUpdatesFn;
  /** `'url'` = filter bar reads/writes search params (standalone `/updates` page). `'local'` = filters in memory so the object profile tab does not navigate or lose active tab. */
  filterSync?: 'url' | 'local';
  viewerUsername?: string | null;
  tagCategoryNames?: readonly string[];
};

export function ObjectUpdatesFeed({
  objectId,
  initialItems,
  initialCursor,
  initialHasMore,
  filters: filtersProp,
  typeOptions,
  showLocaleFilter,
  localizableTypes,
  loadMoreAction,
  filterSync = 'url',
  viewerUsername,
  tagCategoryNames = [],
}: ObjectUpdatesFeedProps) {
  const { t } = useI18n();
  const { openLogin } = useLoginModal();
  const effectiveViewerUsername = useEffectiveViewerUsername(viewerUsername);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ObjectUpdatesUrlFilters>(filtersProp);
  const filters = filterSync === 'local' ? localFilters : filtersProp;

  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, startTransition] = useTransition();

  const localizable = new Set(localizableTypes);

  const onFiltersChange = (next: ObjectUpdatesUrlFilters) => {
    setLocalFilters(next);
    startTransition(async () => {
      const page = await loadMoreAction(objectId, next, null);
      setItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    });
  };

  const filterBarExtra =
    filterSync === 'local'
      ? { mode: 'controlled' as const, filters, onFiltersChange }
      : {};

  const supportedUpdateTypes = typeOptions.map((o) => o.value);
  const canAddUpdate = supportedUpdateTypes.length > 0;

  return (
    <section className="rounded-card border border-border bg-surface/80 p-card-padding">
      <div className="mb-4">
        <ObjectUpdatesFilterBar
          {...filterBarExtra}
          typeOptions={typeOptions}
          showLocaleFilter={showLocaleFilter}
          onAddUpdate={
            canAddUpdate
              ? () => {
                  if (!effectiveViewerUsername) {
                    openLogin();
                    return;
                  }
                  setAddModalOpen(true);
                }
              : undefined
          }
        />
      </div>
      {effectiveViewerUsername && addModalOpen ? (
        <AddUpdateModal
          open
          mode="feedAdd"
          onClose={() => setAddModalOpen(false)}
          objectId={objectId}
          viewerUsername={effectiveViewerUsername}
          tagCategoryNames={tagCategoryNames}
          candidateUpdateTypes={supportedUpdateTypes}
          initialUpdateType={filters.update_type}
          initialLocale={filters.locale}
        />
      ) : null}
      {items.length === 0 ? (
        <p className="text-body-sm text-muted">{t('object_updates_empty')}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.update_id} className="list-none">
                <UpdateCard
                  item={item}
                  showLocaleBadge={localizable.has(item.update_type)}
                />
              </li>
            ))}
          </ul>
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={pending}
                className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-medium text-fg hover:bg-surface-control-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const next = await loadMoreAction(objectId, filters, cursor);
                    setItems((prev) => mergeUniqueByUpdateId(prev, next.items));
                    setCursor(next.cursor);
                    setHasMore(next.hasMore);
                  });
                }}
              >
                {pending ? t('drafts_loading') : t('drafts_load_more')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
