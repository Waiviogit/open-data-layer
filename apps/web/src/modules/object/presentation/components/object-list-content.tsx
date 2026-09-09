'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { ObjectCard } from '@/modules/feed/presentation';
import { ObjectRefSearchField } from '@/modules/object-updates/presentation/components/object-ref-search-field';
import { SortDropdown } from '@/modules/user-social/presentation/components/sort-dropdown';

import { projectedListItemToObjectView } from '../../application/mappers/projected-list-item-to-object-view';
import type {
  CatalogListSortType,
  ProjectedListItem,
  ProjectedSortCustom,
} from '../../domain/projected-list-item.types';
import { useListCatalogEdit } from '../hooks/use-list-catalog-edit';

const IN_COLUMN_TYPES = new Set(['list', 'page', 'skill']);

const BASE_SORT_OPTIONS: CatalogListSortType[] = [
  'rank',
  'reverse_recency',
  'recency',
  'by-name-asc',
  'by-name-desc',
];

export type CatalogListSortOption = CatalogListSortType | 'custom';

function objectHref(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}`;
}

function ListCatalogRow({
  item,
  inColumn,
  onNavigateInColumn,
  rejectControl,
}: {
  item: ProjectedListItem;
  inColumn: boolean;
  onNavigateInColumn: (item: ProjectedListItem) => void;
  rejectControl?: ReactNode;
}) {
  const className =
    'flex min-w-0 items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition hover:bg-surface-alt focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent';
  const countLabel = item.listItemsCount !== undefined ? ` (${item.listItemsCount})` : '';

  const titleLine = (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
      {inColumn ? (
        <button
          type="button"
          className="min-w-0 truncate font-weight-label text-fg text-left hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={() => onNavigateInColumn(item)}
        >
          {item.name}
          {countLabel}
        </button>
      ) : (
        <Link
          href={objectHref(item.objectId)}
          className="min-w-0 truncate font-weight-label text-fg hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          suppressHydrationWarning
        >
          {item.name}
          {countLabel}
        </Link>
      )}
      {rejectControl}
    </span>
  );

  return (
    <div className={className}>
      <div className="min-w-0 flex-1">{titleLine}</div>
      <span className="shrink-0 text-body-lg text-muted" aria-hidden>
        ›
      </span>
    </div>
  );
}

export type ObjectListContentProps = {
  items: ProjectedListItem[];
  catalogObjectId: string;
  onNavigateInColumn: (item: ProjectedListItem) => void;
  pending?: boolean;
  sortCustom?: ProjectedSortCustom | null;
  activeSortType: CatalogListSortOption;
  onSortChange: (next: CatalogListSortOption) => void;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
  isEditMode?: boolean;
};

export function ObjectListContent({
  items,
  catalogObjectId,
  onNavigateInColumn,
  pending = false,
  sortCustom = null,
  activeSortType,
  onSortChange,
  viewerUsername,
  onRequireLogin,
  isEditMode = false,
}: ObjectListContentProps) {
  const { t } = useI18n();
  const [addObjectId, setAddObjectId] = useState('');
  const showEditControls = isEditMode && Boolean(viewerUsername?.trim());
  const { addListItem, rejectListItem, busy, actionError } = useListCatalogEdit({
    catalogObjectId,
    viewerUsername,
    onRequireLogin,
  });

  const excludeObjectIds = useMemo(
    () => [catalogObjectId, ...items.map((item) => item.objectId)],
    [catalogObjectId, items],
  );

  const sortOptions = useMemo(() => {
    const labelFor: Record<CatalogListSortOption, string> = {
      rank: t('catalog_sort_rank'),
      reverse_recency: t('catalog_sort_newest'),
      recency: t('catalog_sort_oldest'),
      'by-name-asc': t('catalog_sort_az'),
      'by-name-desc': t('catalog_sort_za'),
      custom: t('catalog_sort_custom'),
    };
    const values: CatalogListSortOption[] = [...BASE_SORT_OPTIONS];
    if ((sortCustom?.include.length ?? 0) > 0) {
      values.push('custom');
    }
    return values.map((value) => ({ value, label: labelFor[value] }));
  }, [sortCustom?.include.length, t]);

  const rejectButton = (updateId: string | undefined) => {
    if (!showEditControls || !updateId) {
      return undefined;
    }
    return (
      <button
        type="button"
        className="shrink-0 text-body-sm text-accent hover:text-error disabled:opacity-50"
        disabled={busy}
        onClick={() => void rejectListItem(updateId)}
      >
        ({t('object_list_reject')})
      </button>
    );
  };

  const addObjectField = showEditControls ? (
    <div className="rounded-card border border-border bg-surface p-card-padding">
      {actionError ? (
        <p className="mb-2 text-body-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}
      <ObjectRefSearchField
        value={addObjectId}
        onChange={(nextId) => {
          setAddObjectId(nextId);
          if (nextId.trim()) {
            void addListItem(nextId).finally(() => setAddObjectId(''));
          }
        }}
        label={t('object_list_add_object')}
        excludeObjectIds={excludeObjectIds}
        updateType="listItem"
        fieldLabel={t('object_list_add_object')}
      />
    </div>
  ) : null;

  if (items.length === 0 && !pending) {
    return (
      <div className="flex flex-col gap-3">
        {addObjectField}
        <div className="flex justify-end">
          <SortDropdown value={activeSortType} options={sortOptions} onChange={onSortChange} />
        </div>
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
          <p className="text-fg">{t('object_list_empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {addObjectField}
      <div className="flex justify-end">
        <SortDropdown value={activeSortType} options={sortOptions} onChange={onSortChange} />
      </div>
      {pending ? (
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
          Loading…
        </div>
      ) : null}
      {items.map((item) => {
        const rejectControl = rejectButton(item.listItemUpdateId);

        if (item.objectType === 'list') {
          return (
            <ListCatalogRow
              key={item.objectId}
              item={item}
              inColumn={IN_COLUMN_TYPES.has(item.objectType)}
              onNavigateInColumn={onNavigateInColumn}
              rejectControl={rejectControl}
            />
          );
        }

        const inColumn = IN_COLUMN_TYPES.has(item.objectType);
        return (
          <ObjectCard
            key={item.objectId}
            as="div"
            layout="catalog"
            object={projectedListItemToObjectView(item)}
            viewerUsername={viewerUsername}
            onRequireLogin={onRequireLogin}
            onNavigate={inColumn ? () => onNavigateInColumn(item) : undefined}
            titleSuffix={rejectControl}
          />
        );
      })}
    </div>
  );
}
