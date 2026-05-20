'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, type ChangeEvent } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import {
  SortDropdown,
  type SortOption,
} from '@/modules/user-social/presentation/components/sort-dropdown';

import type { ObjectUpdatesUrlFilters } from '../../application/parse-object-updates-search-params';

export type UpdateTypeOption = { value: string; label: string };

export type ObjectUpdatesFilterBarProps = {
  typeOptions: UpdateTypeOption[];
  showLocaleFilter: boolean;
  /** BCP 47-ish locale codes for interface-language filter. */
  localeOptions?: string[];
  onAddUpdate?: () => void;
} & (
  | { mode?: 'url' }
  | {
      mode: 'controlled';
      filters: ObjectUpdatesUrlFilters;
      onFiltersChange: (next: ObjectUpdatesUrlFilters) => void;
    }
);

const DEFAULT_LOCALE_OPTIONS = [
  'en-US',
  'es-ES',
  'ru-RU',
  'fr-FR',
  'de-DE',
  'it-IT',
  'uk-UA',
  'zh-CN',
  'ja-JP',
];

export function ObjectUpdatesFilterBar(props: ObjectUpdatesFilterBarProps) {
  const {
    typeOptions,
    showLocaleFilter,
    localeOptions = DEFAULT_LOCALE_OPTIONS,
    onAddUpdate,
  } = props;
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = props.mode ?? 'url';

  const urlFilters = useMemo((): ObjectUpdatesUrlFilters => {
    const sortRaw = searchParams.get('sort') ?? '';
    const sort: ObjectUpdatesUrlFilters['sort'] =
      sortRaw === 'approval' ? 'approval' : 'recency';
    const ut = searchParams.get('update_type')?.trim();
    const loc = searchParams.get('locale')?.trim();
    return {
      sort,
      update_type: ut && ut.length > 0 ? ut : undefined,
      locale: loc && loc.length > 0 ? loc : undefined,
    };
  }, [searchParams]);

  const filters = props.mode === 'controlled' ? props.filters : urlFilters;

  const replaceParams = useCallback(
    (mutate: (u: URLSearchParams) => void) => {
      if (mode === 'controlled') {
        return;
      }
      const u = new URLSearchParams(searchParams.toString());
      mutate(u);
      const next = u.toString();
      router.replace(next.length > 0 ? `${pathname}?${next}` : pathname);
    },
    [mode, pathname, router, searchParams],
  );

  const sortOptions: SortOption<ObjectUpdatesUrlFilters['sort']>[] = useMemo(
    () => [
      { value: 'recency', label: t('object_updates_sort_recency') },
      { value: 'approval', label: t('object_updates_sort_approval') },
    ],
    [t],
  );

  const onSortChange = useCallback(
    (nextSort: ObjectUpdatesUrlFilters['sort']) => {
      if (props.mode === 'controlled') {
        props.onFiltersChange({ ...props.filters, sort: nextSort });
        return;
      }
      replaceParams((u) => {
        u.set('sort', nextSort);
      });
    },
    [props, replaceParams],
  );

  const onTypeChange = useCallback(
    (ev: ChangeEvent<HTMLSelectElement>) => {
      const v = ev.target.value;
      if (props.mode === 'controlled') {
        props.onFiltersChange({
          ...props.filters,
          update_type: v === '' ? undefined : v,
        });
        return;
      }
      replaceParams((u) => {
        if (v === '') {
          u.delete('update_type');
        } else {
          u.set('update_type', v);
        }
      });
    },
    [props, replaceParams],
  );

  const onLocaleChange = useCallback(
    (ev: ChangeEvent<HTMLSelectElement>) => {
      const v = ev.target.value;
      if (props.mode === 'controlled') {
        props.onFiltersChange({
          ...props.filters,
          locale: v === '' ? undefined : v,
        });
        return;
      }
      replaceParams((u) => {
        if (v === '') {
          u.delete('locale');
        } else {
          u.set('locale', v);
        }
      });
    },
    [props, replaceParams],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-caption text-muted sm:min-w-[10rem]">
          <span>{t('object_updates_filter_type')}</span>
          <select
            className="rounded-md border border-border bg-surface-control px-2 py-2 text-body-sm text-fg"
            value={filters.update_type ?? ''}
            onChange={onTypeChange}
          >
            <option value="">{t('object_updates_all_types')}</option>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {showLocaleFilter ? (
          <label className="flex flex-col gap-1 text-caption text-muted sm:min-w-[10rem]">
            <span>{t('object_updates_filter_locale')}</span>
            <select
              className="rounded-md border border-border bg-surface-control px-2 py-2 text-body-sm text-fg"
              value={filters.locale ?? ''}
              onChange={onLocaleChange}
            >
              <option value="">{t('object_updates_all_locales')}</option>
              {localeOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {onAddUpdate ? (
          <button
            type="button"
            onClick={onAddUpdate}
            className="rounded-btn border border-border bg-accent px-4 py-2 text-body-sm font-medium text-accent-fg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t('object_edit_add_update')}
          </button>
        ) : null}
        <SortDropdown value={filters.sort} options={sortOptions} onChange={onSortChange} />
      </div>
    </div>
  );
}
