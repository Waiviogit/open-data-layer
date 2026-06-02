'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { ObjectCard } from '@/modules/feed/presentation';
import { SortDropdown } from '@/modules/user-social/presentation/components/sort-dropdown';

import { projectedListItemToObjectView } from '../../application/mappers/projected-list-item-to-object-view';
import type {
  CatalogListSortType,
  ProjectedListItem,
  ProjectedSortCustom,
} from '../../domain/projected-list-item.types';

const IN_COLUMN_TYPES = new Set(['list', 'page']);

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
}: {
  item: ProjectedListItem;
  inColumn: boolean;
  onNavigateInColumn: (item: ProjectedListItem) => void;
}) {
  const className =
    'flex min-w-0 items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
  const countLabel = item.listItemsCount !== undefined ? ` (${item.listItemsCount})` : '';
  const inner = (
    <>
      <span className="min-w-0 flex-1 truncate font-weight-label text-fg">
        {item.name}
        {countLabel}
      </span>
      <span className="shrink-0 text-body-lg text-muted" aria-hidden>
        ›
      </span>
    </>
  );

  if (inColumn) {
    return (
      <button type="button" className={`w-full ${className}`} onClick={() => onNavigateInColumn(item)}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={objectHref(item.objectId)} className={className} suppressHydrationWarning>
      {inner}
    </Link>
  );
}

export type ObjectListContentProps = {
  items: ProjectedListItem[];
  onNavigateInColumn: (item: ProjectedListItem) => void;
  pending?: boolean;
  /** The sort custom of the current list object (to determine available options). */
  sortCustom?: ProjectedSortCustom | null;
  activeSortType: CatalogListSortOption;
  onSortChange: (next: CatalogListSortOption) => void;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

export function ObjectListContent({
  items,
  onNavigateInColumn,
  pending = false,
  sortCustom = null,
  activeSortType,
  onSortChange,
  viewerUsername,
  onRequireLogin,
}: ObjectListContentProps) {
  const { t } = useI18n();

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

  if (items.length === 0 && !pending) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <SortDropdown value={activeSortType} options={sortOptions} onChange={onSortChange} />
        </div>
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
          <p className="text-fg">This list is empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <SortDropdown value={activeSortType} options={sortOptions} onChange={onSortChange} />
      </div>
      {pending ? (
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
          Loading…
        </div>
      ) : null}
      {items.map((item, index) => {
        if (item.objectType === 'list') {
          return (
            <ListCatalogRow
              key={`${item.objectId}-${index}`}
              item={item}
              inColumn={IN_COLUMN_TYPES.has(item.objectType)}
              onNavigateInColumn={onNavigateInColumn}
            />
          );
        }

        const inColumn = IN_COLUMN_TYPES.has(item.objectType);
        return (
          <ObjectCard
            key={`${item.objectId}-${index}`}
            as="div"
            object={projectedListItemToObjectView(item)}
            viewerUsername={viewerUsername}
            onRequireLogin={onRequireLogin}
            onNavigate={inColumn ? () => onNavigateInColumn(item) : undefined}
          />
        );
      })}
    </div>
  );
}
