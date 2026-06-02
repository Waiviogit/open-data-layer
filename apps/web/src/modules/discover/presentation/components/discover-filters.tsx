'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { buildDiscoverHref, decodeTagFilter, encodeTagFilter } from '../../domain/discover-url';
import { getTagCategoryNamesForObjectType } from '../../domain/discover-registry';
import { fetchDiscoverTagCategories } from '../../infrastructure/discover.client';
import type { DiscoverTagCategoriesResponse } from '../../domain/discover-response.schema';
import { ChipRemoveIcon } from './discover-chip-icons';

const FILTER_DEBOUNCE_MS = 300;
const DEFAULT_OPEN_CATEGORIES = 2;
/** Max height for scrollable item list inside an expanded category (~14 rows). */
const CATEGORY_LIST_MAX_HEIGHT = 'max-h-72';

type TagCategorySection = {
  category: string;
  items: { value: string; count: number }[];
};

function orderTagSections(
  categories: DiscoverTagCategoriesResponse['categories'] | undefined,
  registryOrder: string[],
): TagCategorySection[] {
  const sections: TagCategorySection[] =
    categories ??
    registryOrder.map((category) => ({
      category,
      items: [] as { value: string; count: number }[],
    }));

  if (registryOrder.length === 0) {
    return sections;
  }
  return [
    ...registryOrder
      .map((name) => sections.find((s) => s.category === name))
      .filter((s): s is TagCategorySection => s != null),
    ...sections.filter((s) => !registryOrder.includes(s.category)),
  ];
}

function buildDefaultCollapsed(
  sections: TagCategorySection[],
  selectedTags: string[],
): Set<string> {
  const collapsed = new Set<string>();
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const hasSelected = section.items.some((item) =>
      selectedTags.includes(encodeTagFilter(section.category, item.value)),
    );
    if (i >= DEFAULT_OPEN_CATEGORIES && !hasSelected) {
      collapsed.add(section.category);
    }
  }
  return collapsed;
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registryOrder = useMemo(
    () => getTagCategoryNamesForObjectType(objectType),
    [objectType],
  );

  const orderedSections = useMemo(
    () => orderTagSections(data?.categories, registryOrder),
    [data?.categories, registryOrder],
  );

  useEffect(() => {
    setCollapsedCategories(new Set());
  }, [objectType, registryOrder]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void (async () => {
      const res = await fetchDiscoverTagCategories(objectType, {
        tags,
        signal: ac.signal,
      });
      if (!ac.signal.aborted) {
        setData(res);
        if (res && tags.length === 0) {
          setCollapsedCategories(
            buildDefaultCollapsed(orderTagSections(res.categories, registryOrder), tags),
          );
        }
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [objectType, tags, registryOrder]);

  useEffect(() => {
    if (tags.length === 0 || !data?.categories) {
      return;
    }
    const sections = orderTagSections(data.categories, registryOrder);
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const section of sections) {
        const hasSelected = section.items.some((item) =>
          tags.includes(encodeTagFilter(section.category, item.value)),
        );
        if (hasSelected && next.has(section.category)) {
          next.delete(section.category);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tags, data, registryOrder]);

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

  const toggleCollapse = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pushTags([]);
  }, [pushTags]);

  return (
    <aside
      className="relative z-0 min-w-0 w-full self-start overflow-hidden"
      aria-busy={loading}
    >
      <h2 className="mb-3 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
        {t('discover_filters_title')}
      </h2>
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-surface-control" aria-hidden />
          ))}
        </div>
      ) : (
        <>
          {tags.length > 0 ? (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-caption font-weight-label text-fg-tertiary">
                  {t('discover_selected_filters')}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-caption text-accent underline-offset-2 hover:underline"
                  onClick={clearAll}
                >
                  {t('discover_clear_all')}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-caption text-accent"
                  >
                    <span className="truncate">{decodeTagFilter(tag)?.value ?? tag}</span>
                    <button
                      type="button"
                      aria-label={t('discover_remove_filter').replace(
                        '{tag}',
                        decodeTagFilter(tag)?.value ?? tag,
                      )}
                      className="shrink-0 rounded-full p-0.5 hover:bg-accent/20"
                      onClick={() => onToggleTag(tag, false)}
                    >
                      <ChipRemoveIcon />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            {orderedSections.map((section) => {
              const collapsed = collapsedCategories.has(section.category);

              return (
                <section
                  key={section.category}
                  className="border-b border-border pb-2 last:border-b-0"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-1.5 text-start text-body-sm font-weight-label text-fg"
                    onClick={() => toggleCollapse(section.category)}
                    aria-expanded={!collapsed}
                  >
                    <span>{section.category}</span>
                    <ChevronIcon
                      className={`shrink-0 text-fg-secondary transition-transform duration-150 ${
                        collapsed ? '' : 'rotate-180'
                      }`}
                    />
                  </button>
                  {!collapsed ? (
                    <div
                      className={`${CATEGORY_LIST_MAX_HEIGHT} scrollbar-minimal overflow-y-auto pe-0.5`}
                    >
                      <ul className="flex flex-col gap-1 pb-1">
                        {section.items.map((item) => {
                          const encoded = encodeTagFilter(section.category, item.value);
                          const checked = tags.includes(encoded);
                          return (
                            <li key={`${section.category}-${item.value}`}>
                              <label className="flex cursor-pointer items-center gap-2 text-body-sm text-fg-secondary hover:text-fg">
                                <input
                                  type="checkbox"
                                  className="rounded border-border"
                                  checked={checked}
                                  onChange={(e) => onToggleTag(encoded, e.target.checked)}
                                />
                                <span className="min-w-0 flex-1 truncate">{item.value}</span>
                                <span className="tabular-nums text-caption">({item.count})</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
