'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { buildDiscoverHref } from '../../domain/discover-url';
import { getTagCategoryNamesForObjectType } from '../../domain/discover-registry';
import { fetchDiscoverTagCategories } from '../../infrastructure/discover.client';
import type { DiscoverTagCategoriesResponse } from '../../domain/discover-response.schema';

const FILTER_DEBOUNCE_MS = 300;
const ITEMS_INITIAL = 5;
const ITEMS_STEP = 5;

type TagCategorySection = {
  category: string;
  items: { value: string; count: number }[];
};

/** Minimum visible rows so every selected tag in this section is shown. */
function minVisibleForSection(section: TagCategorySection, selectedTags: string[]): number {
  let maxCheckedIndex = -1;
  for (let i = 0; i < section.items.length; i++) {
    if (selectedTags.includes(section.items[i].value)) {
      maxCheckedIndex = i;
    }
  }
  if (maxCheckedIndex < ITEMS_INITIAL) {
    return ITEMS_INITIAL;
  }
  return maxCheckedIndex + 1;
}

export type DiscoverFiltersProps = {
  objectType: string;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
};

export function DiscoverFilters({ objectType, q, tags, sort }: DiscoverFiltersProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<DiscoverTagCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCounts, setVisibleCounts] = useState<Map<string, number>>(() => new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registryOrder = getTagCategoryNamesForObjectType(objectType);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setVisibleCounts(new Map());
    void (async () => {
      const res = await fetchDiscoverTagCategories(objectType, { signal: ac.signal });
      if (!ac.signal.aborted) {
        setData(res);
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [objectType]);

  const pushTags = useCallback(
    (nextTags: string[]) => {
      router.push(buildDiscoverHref({ type: objectType, q, tags: nextTags, sort }));
    },
    [router, objectType, q, sort],
  );

  const onToggleTag = useCallback(
    (value: string, checked: boolean) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      const next = checked ? [...tags, value] : tags.filter((t) => t !== value);
      debounceRef.current = setTimeout(() => {
        pushTags(next);
        debounceRef.current = null;
      }, FILTER_DEBOUNCE_MS);
    },
    [tags, pushTags],
  );

  const sections =
    data?.categories ??
    registryOrder.map((category) => ({ category, items: [] as { value: string; count: number }[] }));

  const orderedSections = useMemo((): TagCategorySection[] => {
    if (registryOrder.length === 0) {
      return sections;
    }
    return [
      ...registryOrder
        .map((name) => sections.find((s) => s.category === name))
        .filter((s): s is TagCategorySection => s != null),
      ...sections.filter((s) => !registryOrder.includes(s.category)),
    ];
  }, [sections, registryOrder]);

  const getVisibleCount = useCallback(
    (section: TagCategorySection): number => {
      const userCount = visibleCounts.get(section.category) ?? ITEMS_INITIAL;
      const required = minVisibleForSection(section, tags);
      return Math.min(section.items.length, Math.max(userCount, required));
    },
    [visibleCounts, tags],
  );

  const showMore = useCallback((category: string, currentCount: number) => {
    setVisibleCounts((prev) => {
      const next = new Map(prev);
      next.set(category, currentCount + ITEMS_STEP);
      return next;
    });
  }, []);

  return (
    <aside className="min-w-0">
      <h2 className="mb-3 text-caption font-medium uppercase tracking-wide text-fg-tertiary">
        {t('discover_filters_title')}
      </h2>
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-surface-control" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {orderedSections.map((section) => {
            const visibleCount = getVisibleCount(section);
            const visibleItems = section.items.slice(0, visibleCount);
            const remaining = section.items.length - visibleCount;
            const nextBatch = Math.min(ITEMS_STEP, remaining);

            return (
              <section key={section.category}>
                <h3 className="mb-1.5 text-body-sm font-medium text-fg">{section.category}</h3>
                <ul className="flex flex-col gap-1">
                  {visibleItems.map((item) => {
                    const checked = tags.includes(item.value);
                    return (
                      <li key={`${section.category}-${item.value}`}>
                        <label className="flex cursor-pointer items-center gap-2 text-body-sm text-fg-secondary hover:text-fg">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={checked}
                            onChange={(e) => onToggleTag(item.value, e.target.checked)}
                          />
                          <span className="min-w-0 flex-1 truncate">{item.value}</span>
                          <span className="tabular-nums text-caption">({item.count})</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {remaining > 0 ? (
                  <button
                    type="button"
                    className="mt-1 text-caption text-accent underline-offset-2 hover:underline"
                    onClick={() => showMore(section.category, visibleCount)}
                  >
                    {t('discover_show_more')} ({nextBatch})
                  </button>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}
