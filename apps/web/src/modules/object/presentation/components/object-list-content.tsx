'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { mergeRatingDimensions } from '@/modules/feed/application/dto/object-card-rating';
import { getRatingDimensionNamesForObjectType } from '@/modules/discover/domain/discover-registry';
import { SortDropdown } from '@/modules/user-social/presentation/components/sort-dropdown';

import type {
  CatalogListSortType,
  ProjectedListItem,
  ProjectedSortCustom,
} from '../../domain/projected-list-item.types';

import { AdministrativeHeartButton } from './administrative-heart-button';
import { StarRating } from './star-rating';

import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

const IN_COLUMN_TYPES = new Set(['list', 'page']);
const OBJECT_CARD_THUMB_SIZE = 64;

function formatObjectTypeLabel(type: string): string {
  const trimmed = type.trim();
  if (trimmed.length === 0) {
    return '';
  }
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function buildObjectCardSubtitle(item: ProjectedListItem): string {
  const parts = [
    formatObjectTypeLabel(item.objectType),
    ...(item.tagCategoryLabels ?? []).filter(Boolean),
  ].filter(Boolean);
  return parts.join(' · ');
}

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

const navFocusClass =
  'rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function CardNavTrigger({
  item,
  inColumn,
  onNavigateInColumn,
  className,
  children,
  ariaLabel,
}: {
  item: ProjectedListItem;
  inColumn: boolean;
  onNavigateInColumn: (item: ProjectedListItem) => void;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  if (inColumn) {
    return (
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        onClick={() => onNavigateInColumn(item)}
      >
        {children}
      </button>
    );
  }
  return (
    <Link href={objectHref(item.objectId)} className={className} aria-label={ariaLabel}>
      {children}
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
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
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
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          Loading…
        </div>
      ) : null}
      {items.map((item, index) => (
        <ListItemCard
          key={`${item.objectId}-${index}`}
          item={item}
          onNavigateInColumn={onNavigateInColumn}
          viewerUsername={viewerUsername}
          onRequireLogin={onRequireLogin}
        />
      ))}
    </div>
  );
}

function ListItemCard({
  item,
  onNavigateInColumn,
  viewerUsername,
  onRequireLogin,
}: {
  item: ProjectedListItem;
  onNavigateInColumn: (item: ProjectedListItem) => void;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
}) {
  const inColumn = IN_COLUMN_TYPES.has(item.objectType);
  const isListType = item.objectType === 'list';

  if (isListType) {
    const className =
      'flex min-w-0 items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
    const countLabel =
      item.listItemsCount !== undefined ? ` (${item.listItemsCount})` : '';
    const inner = (
      <>
        <span className="min-w-0 flex-1 truncate font-medium text-fg">
          {item.name}
          {countLabel}
        </span>
        <span className="shrink-0 text-lg text-muted" aria-hidden>
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
      <Link href={objectHref(item.objectId)} className={className}>
        {inner}
      </Link>
    );
  }

  const className =
    'relative flex min-w-0 items-start gap-3 rounded-card border border-border bg-surface p-3 text-left transition hover:bg-surface-alt';
  const subtitle = buildObjectCardSubtitle(item);
  const ratingDims = mergeRatingDimensions(
    getRatingDimensionNamesForObjectType(item.objectType),
    (item.aggregateRatingAspects ?? []).map((a) => ({
      update_id: a.update_id,
      dimension: a.dimension,
      averageRating: a.averageRating,
      userRating: a.userRating,
      totalVoters: a.totalVoters,
    })),
  );

  const thumb = item.imageUrl ? (
    <Image
      src={item.imageUrl}
      alt=""
      width={OBJECT_CARD_THUMB_SIZE}
      height={OBJECT_CARD_THUMB_SIZE}
      className="size-16 shrink-0 rounded-btn object-cover"
      unoptimized={shouldUnoptimizeRemoteImage(item.imageUrl)}
    />
  ) : (
    <span
      className="flex size-16 shrink-0 items-center justify-center rounded-btn bg-surface-alt text-sm font-medium text-muted"
      aria-hidden
    >
      {item.name.slice(0, 1).toUpperCase()}
    </span>
  );

  return (
    <article className={className}>
      <div className="absolute end-3 top-3 z-10">
        <AdministrativeHeartButton
          objectId={item.objectId}
          initialActive={item.hasAdministrativeAuthority ?? false}
          viewerUsername={viewerUsername}
          onRequireLogin={onRequireLogin}
        />
      </div>
      <CardNavTrigger
        item={item}
        inColumn={inColumn}
        onNavigateInColumn={onNavigateInColumn}
        className={`shrink-0 ${navFocusClass}`}
        ariaLabel={item.name}
      >
        {thumb}
      </CardNavTrigger>
      <div className="min-w-0 flex-1 pe-8">
        <CardNavTrigger
          item={item}
          inColumn={inColumn}
          onNavigateInColumn={onNavigateInColumn}
          className={`block max-w-full truncate text-left font-medium text-fg hover:underline ${navFocusClass}`}
        >
          {item.name}
        </CardNavTrigger>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span>
        ) : null}
        {ratingDims.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {ratingDims.map(
              ({ dimension, update_id, averageRating01To5, userRating01To5, totalVoters }) => (
                <div key={dimension} className="flex min-w-0 items-center gap-1.5">
                  <StarRating
                    averageRating01To5={averageRating01To5}
                    userRating01To5={userRating01To5}
                    totalVoters={totalVoters}
                    dimension={dimension}
                    updateId={update_id ?? ''}
                    valueText={update_id ? undefined : dimension}
                    objectId={item.objectId}
                    viewerUsername={viewerUsername}
                    onRequireLogin={onRequireLogin}
                    size="sm"
                    showNumeric={false}
                  />
                  <span className="truncate text-caption text-fg-secondary">{dimension}</span>
                </div>
              ),
            )}
          </div>
        ) : null}
        {item.description ? (
          <span className="mt-2 line-clamp-2 block text-body-sm leading-body text-muted">
            {item.description}
          </span>
        ) : null}
      </div>
    </article>
  );
}
